import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent } from './ui/Card';
import type { Server } from '../types';

interface ServerCardProps {
  server: Server;
  game?: string;
}

export function ServerCard({ server, game = 'reforger' }: ServerCardProps) {
  const gp = game === 'reforger' ? '' : `/${game}`;
  const fillPercent = (server.players / server.maxPlayers) * 100;

  return (
    <Card className="group overflow-hidden border-none border-l-4 border-l-zinc-800 hover:border-l-tactical-orange transition-all duration-300 bg-zinc-900/50 backdrop-blur-sm">
      <CardHeader className="bg-black/30 p-5 border-b border-white/5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] text-tactical-orange font-black uppercase tracking-[0.4em]">RANK</span>
              <span className="text-lg text-white font-black font-mono tracking-tighter italic">
                # {server.sqeRank ?? 'UNRANKED'}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[7px] text-gray-600 font-black uppercase tracking-[0.4em]">MODS</span>
              <span className="text-lg text-white font-black font-mono tracking-tighter">[{server.mods?.length ?? 0}]</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Link to={`${gp}/server/${server.id}`} className="block">
              <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight group-hover:translate-x-1 transition-transform truncate" title={server.name}>
                {server.name}
              </h3>
            </Link>
            {server.ip && (
              <p className="inline-block text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] font-mono bg-black/60 px-3 py-1 border border-white/5">
                {server.ip}:{server.port}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-600">Personnel Status</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-white font-mono">{server.players}</span>
              <span className="text-[10px] text-gray-600">/</span>
              <span className="text-[10px] font-bold text-gray-400">{server.maxPlayers}</span>
            </div>
          </div>
          <div className="relative h-2 bg-black border border-white/5 group-hover:border-white/10 transition-all overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-in-out bg-tactical-orange/40`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/40 p-4 border border-white/5 group-hover:bg-black transition-all text-center">
            <p className="text-2xl font-black text-white group-hover:text-tactical-orange transition-colors">{server.players}</p>
            <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em] mt-1">Deployed</p>
          </div>
          <div className="bg-black/40 p-4 border border-white/5 group-hover:bg-black transition-all text-center">
            <p className="text-2xl font-black text-white group-hover:text-tactical-orange transition-colors">{server.maxPlayers}</p>
            <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em] mt-1">Total-Cap</p>
          </div>
        </div>

        <Link
          to={`${gp}/server/${server.id}`}
          className="flex items-center justify-center w-full px-4 py-3 bg-zinc-900/50 border border-white/5 text-gray-400 text-[8px] font-black uppercase tracking-[0.3em] hover:bg-tactical-orange hover:text-black transition-all"
        >
          Access Signal
        </Link>
      </CardContent>
    </Card>
  );
}
