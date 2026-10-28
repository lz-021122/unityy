import React, { useState } from 'react';
import { X, Activity, Cpu, Wifi, CheckCircle2, RefreshCw, Zap, Server } from 'lucide-react';

interface EngineStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EngineStatusModal: React.FC<EngineStatusModalProps> = ({ isOpen, onClose }) => {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastPing, setLastPing] = useState(28);

  if (!isOpen) return null;

  const handleTestPing = () => {
    setIsReconnecting(true);
    setTimeout(() => {
      setLastPing(Math.floor(22 + Math.random() * 12));
      setIsReconnecting(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Unity 数字孪生演示状态</h3>
              <p className="text-[11px] text-slate-500">
                静态演示数据 · 未连接 Unity WebSocket
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Status Alert Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>演示监控数据 · 未连接真实服务</span>
            </div>
            <button
              onClick={handleTestPing}
              disabled={isReconnecting}
              className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-700 font-medium text-[11px] hover:bg-amber-100 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>模拟刷新</span>
            </button>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-blue-500" />
                <span>模拟网络延迟</span>
              </div>
              <div className="text-xl font-bold text-slate-800 mt-1">{lastPing} ms</div>
              <div className="text-[10px] text-slate-500 mt-0.5">静态演示值</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>模拟渲染帧率 (FPS)</span>
              </div>
              <div className="text-xl font-bold text-slate-800 mt-1">60.0 FPS</div>
              <div className="text-[10px] text-slate-500 mt-0.5">静态演示值</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>空间坐标解算负载</span>
              </div>
              <div className="text-xl font-bold text-slate-800 mt-1">14.2%</div>
              <div className="text-[10px] text-slate-500 mt-0.5">8核并发空间定位网格</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-purple-500" />
                <span>目标 Unity 版本</span>
              </div>
              <div className="text-xl font-bold text-slate-800 mt-1">6000.3.27f1</div>
              <div className="text-[10px] text-amber-600 mt-0.5">未连接真实服务</div>
            </div>
          </div>

          {/* Data Channels Details */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <h4 className="font-semibold text-slate-700 mb-2">演示数据管道</h4>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>/unity/telemetry/spatial_points</span>
                <span className="text-slate-500 font-semibold">0 msg/s（未连接）</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>/unity/issues/coordinate_pins</span>
                <span className="text-slate-500 font-semibold">56 个演示锚点</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>/unity/sensors/temperature_vibration</span>
                <span className="text-slate-500 font-semibold">未轮询</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
