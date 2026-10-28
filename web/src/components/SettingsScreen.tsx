import React, { useState } from 'react';
import {
  Settings,
  Server,
  Sliders,
  RefreshCw,
  Save,
} from 'lucide-react';

interface SettingsScreenProps {
  onShowToast: (msg: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onShowToast }) => {
  const [unityWsUrl, setUnityWsUrl] = useState('ws://127.0.0.1:8080/unity-inspect');
  const [heartbeatInterval, setHeartbeatInterval] = useState('1000');
  const [enableCoordinateSnapping, setEnableCoordinateSnapping] = useState(true);
  const [autoAiDiagnosis, setAutoAiDiagnosis] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    onShowToast('演示配置已更新，当前未持久化到服务端');
  };

  const handleTestBridge = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      onShowToast('演示检查：未连接真实 Unity 服务，未发起网络握手');
    }, 700);
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <span>系统与数字孪生配置</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          配置界面的演示说明：当前未连接 Unity 或后端服务
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-5 text-xs">
        {/* Unity Bridge */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
            <Server className="w-4 h-4 text-blue-600" />
            <span>Unity 引擎连接桥接设置</span>
          </h2>
          <p className="text-slate-400 mb-4">
            用于同步 Web 前端与 Unity 客户端世界坐标、视口相机与空间锚点
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                WebSocket 通信地址 (Render Streaming)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={unityWsUrl}
                  onChange={(e) => setUnityWsUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono bg-slate-50/50 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleTestBridge}
                  disabled={isTesting}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>测试连接</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">心跳保活间隔 (ms)</label>
                <input
                  type="number"
                  value={heartbeatInterval}
                  onChange={(e) => setHeartbeatInterval(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50/50"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">坐标系规范</label>
                <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50/50">
                  <option>左手坐标系 (Unity 默认: +X 右, +Y 上, +Z 前)</option>
                  <option>右手坐标系 (OpenGL / Blender)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100"></div>

        {/* Inspection Automation */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>智能巡检与算法判定</span>
          </h2>
          <p className="text-slate-400 mb-4">设定图像自动识别缺陷与红外测温报警阈值</p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={autoAiDiagnosis}
                onChange={(e) => setAutoAiDiagnosis(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-700 block">启用 AI 图像智能初筛</span>
                <span className="text-[11px] text-slate-400">
                  当上传巡检照片时，自动检测法兰渗漏、指针抖动及仪表读数
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={enableCoordinateSnapping}
                onChange={(e) => setEnableCoordinateSnapping(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-700 block">
                  3D 网格坐标自动吸附 (Mesh Snapping)
                </span>
                <span className="text-[11px] text-slate-400">
                  在三维场景中打点时，自动贴合最近的设备表面网格几何体
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="h-px bg-slate-100"></div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>保存配置</span>
          </button>
        </div>
      </div>
    </main>
  );
};
