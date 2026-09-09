// SteamAuthProbe — P0 vartai A — READY TO RUN
// .NET 8 + SteamKit2 3.3.1, tik A vartai, be BI POST. Sauga: jokių paslapčių į logus — tik metadata.
// Sutarta su kolega: QR → LoggedOn OK → GetAuthTicketForWebApi(1874880) su --allow-null-identity kontroliniu.
using SteamKit2;
using SteamKit2.Authentication;
using QRCoder;

const uint ReforgerAppId = 1874880u;
var allowNull = args.Contains("--allow-null-identity");
var ticketOnly = args.Contains("--ticket");

if (args.Contains("--help") || args.Length == 0)
{
    Console.WriteLine("SteamAuthProbe P0 READY TO RUN");
    Console.WriteLine("  dotnet run -- --qr                                      # QR + vault atmintyje");
    Console.WriteLine("  dotnet run -- --ticket --allow-null-identity            # kontrolinis null identity");
    Console.WriteLine("  STEAM_TICKET_IDENTITY env — jei BI patvirtino identity, kitaip tik su flagu");
    return;
}

// Minimalus ISecretStore — testiniame režime tik atmintis, prarandama po proceso (kaip priede).
// Prod vault būtų OS store / systemd credentials — čia neįrašom į diską.
var identity = Environment.GetEnvironmentVariable("STEAM_TICKET_IDENTITY");
if (ticketOnly && identity == null && !allowNull)
{
    Console.Error.WriteLine("STOP: STEAM_TICKET_IDENTITY nenustatyta ir --allow-null-identity nenurodytas.");
    Environment.Exit(2);
}

var client = new SteamClient();
var manager = new CallbackManager(client);
var user = client.GetHandler<SteamUser>()!;
var tickets = client.GetHandler<SteamAuthTicket>()!;
var isRunning = true;
var qrDone = false;

manager.Subscribe<SteamClient.ConnectedCallback>(OnConnected);
manager.Subscribe<SteamClient.DisconnectedCallback>(c => { Console.WriteLine("Disconnected"); isRunning = false; });
manager.Subscribe<SteamUser.LoggedOnCallback>(OnLoggedOn);
manager.Subscribe<SteamUser.LoggedOffCallback>(c => { Console.WriteLine($"LoggedOff {c.Result}"); isRunning = false; });

Console.WriteLine("Connecting...");
client.Connect();
while (isRunning) manager.RunWaitCallbacks(TimeSpan.FromSeconds(1));

async void OnConnected(SteamClient.ConnectedCallback c)
{
    Console.WriteLine($"Connected");
    if (ticketOnly)
    {
        Console.WriteLine("[Probe] --ticket reikalauja esamo LoggedOn. Paleisk pirma --qr.");
        isRunning = false;
        return;
    }
    try
    {
        Console.WriteLine("BeginAuthSessionViaQRAsync...");
        var sess = await client.Authentication.BeginAuthSessionViaQRAsync(new AuthSessionDetails { DeviceFriendlyName = "ReforgerMods Probe", IsPersistentSession = true });
        Console.WriteLine("QR session created");
        sess.ChallengeURLChanged = () => { Console.WriteLine("QR ChallengeURLChanged"); DrawQr(sess); };
        DrawQr(sess);
        Console.WriteLine("PollingWaitForResultAsync — nuskenuok QR per Steam Mobile...");
        var res = await sess.PollingWaitForResultAsync();
        Console.WriteLine($"QR OK Account={res.AccountName} (token ne-loguojamas)");
        user.LogOn(new SteamUser.LogOnDetails { Username = res.AccountName, AccessToken = res.RefreshToken, ShouldRememberPassword = true });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"QR failed: {ex.GetType().Name}: {ex.Message}");
        if (ex.InnerException != null) Console.WriteLine($" Inner: {ex.InnerException.Message}");
        isRunning = false;
    }
}

async void OnLoggedOn(SteamUser.LoggedOnCallback c)
{
    Console.WriteLine($"LoggedOn {c.Result}/{c.ExtendedResult}");
    if (c.Result != EResult.OK) { isRunning = false; return; }
    var useIdentity = identity; // null tik jei --allow-null-identity
    SteamKit2.SteamAuthTicket.TicketInfo? ticket = null;
    try
    {
        ticket = await tickets.GetAuthTicketForWebApi(ReforgerAppId, useIdentity);
        Console.WriteLine($"Ticket success len={ticket.Ticket.Length} identity={(useIdentity ?? "null kontrolinis")} (bytes ne-loguojami)");
        // B vartai — IdentityApi (be lobby) — tik po BI leidimo / diagnostikos. Hex niekur neloguojam.
        var hex = Convert.ToHexString(ticket.Ticket);
        Console.WriteLine($"[B] POST api-ar-id .../reforger/auth {{token: [REDACTED {hex.Length} hex], platform:\"steam\"}}");
        using var http = new HttpClient();
        var payload = System.Text.Json.JsonSerializer.Serialize(new { token = hex, platform = "steam" });
        var resp = await http.PostAsync("https://api-ar-id.bistudio.com/game-identity/api/v1.1/identities/reforger/auth?include=profile",
            new StringContent(payload, System.Text.Encoding.UTF8, "application/json"));
        var body = await resp.Content.ReadAsStringAsync();
        Console.WriteLine($"[B] IdentityApi status={(int)resp.StatusCode} {resp.StatusCode}");
        // Loguojam tik status + trumpą kūną be token (max 500, be hex)
        Console.WriteLine($"[B] body preview: {body.Substring(0, Math.Min(500, body.Length))}");
        if (resp.IsSuccessStatusCode) Console.WriteLine("[B] GO — BI JWT gautas (ne-loguojamas)");
        else Console.WriteLine("[B] STOP — payload arba identity neteisinga");
    }
    catch (Exception ex) { Console.WriteLine($"Ticket/B failed: {ex.GetType().Name}: {ex.Message}"); }
    finally { ticket?.Dispose(); }
    user.LogOff();
}

void DrawQr(QrAuthSession s)
{
    Console.WriteLine("QR ChallengeURL pasikeitė — nuskenuok Steam Mobile (URL ne-loguojamas pilnai, tik QR piešinys)");
    using var gen = new QRCodeGenerator();
    var data = gen.CreateQrCode(s.ChallengeURL, QRCodeGenerator.ECCLevel.L);
    using var qr = new AsciiQRCode(data);
    Console.WriteLine(qr.GetGraphic(1, drawQuietZones: true));
}
