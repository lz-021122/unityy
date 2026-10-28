import React, { useState, useEffect, useRef } from 'react';
import type { Issue } from '../types';
import {
  Box,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Activity,
  ChevronRight,
} from 'lucide-react';

interface SceneManagementScreenProps {
  issues: Issue[];
  selectedIssueForScene?: Issue | null;
  onSelectIssue: (issue: Issue) => void;
  onOpenCreateDrawer: () => void;
}

export const SceneManagementScreen: React.FC<SceneManagementScreenProps> = ({
  issues,
  selectedIssueForScene,
  onSelectIssue,
  onOpenCreateDrawer,
}) => {
  const [activeZone, setActiveZone] = useState<string>(
    selectedIssueForScene?.scene ?? '全部'
  );
  const [cameraView, setCameraView] = useState<'iso' | 'top' | 'front'>('iso');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [inspectedIssue, setInspectedIssue] = useState<Issue | null>(
    selectedIssueForScene || null
  );
  const [showSensors] = useState(true);
  const isSimulating = true;
  const [simTemp, setSimTemp] = useState(78.5);
  const [simPressure, setSimPressure] = useState(1.84);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live sensor telemetry fluctuation simulation
  useEffect(() => {
    if (!isSimulating) return;
    const timer = setInterval(() => {
      setSimTemp((prev) => +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
      setSimPressure((prev) => +(prev + (Math.random() * 0.04 - 0.02)).toFixed(2));
    }, 1800);
    return () => clearInterval(timer);
  }, [isSimulating]);

  // Filter issues according to activeZone
  const displayedIssues = issues.filter(
    (item) => activeZone === '全部' || item.scene === activeZone
  );

  // Draw 3D Digital Twin space on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick += 0.02;
      const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 550);

      ctx.clearRect(0, 0, width, height);

      // Dark industrial cyber-physical twin background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 30;

      // Projection transform based on camera view
      const project = (x: number, y: number, z: number) => {
        const scale = 24 * zoomLevel;
        if (cameraView === 'iso') {
          // Isometric projection
          const px = cx + (x - z) * Math.cos(Math.PI / 6) * scale * 0.8;
          const py = cy + (x + z) * Math.sin(Math.PI / 6) * scale * 0.8 - y * scale;
          return { px, py };
        } else if (cameraView === 'top') {
          // Top-down 2D
          const px = cx + x * scale;
          const py = cy + z * scale;
          return { px, py };
        } else {
          // Front elevation
          const px = cx + x * scale;
          const py = cy - y * scale + 60;
          return { px, py };
        }
      };

      // 1. Draw 3D Isometric Grid Floor
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.lineWidth = 1;
      const gridRange = 12;
      for (let i = -gridRange; i <= gridRange; i += 2) {
        const p1 = project(i, 0, -gridRange);
        const p2 = project(i, 0, gridRange);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();

        const p3 = project(-gridRange, 0, i);
        const p4 = project(gridRange, 0, i);
        ctx.beginPath();
        ctx.moveTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.stroke();
      }

      // 2. Coordinate Axis at Origin (0,0,0)
      const origin = project(0, 0, 0);
      const axisX = project(3, 0, 0);
      const axisY = project(0, 3, 0);
      const axisZ = project(0, 0, 3);

      // X - Red
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(origin.px, origin.py);
      ctx.lineTo(axisX.px, axisX.py);
      ctx.stroke();

      // Y - Green (Up)
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(origin.px, origin.py);
      ctx.lineTo(axisY.px, axisY.py);
      ctx.stroke();

      // Z - Blue
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(origin.px, origin.py);
      ctx.lineTo(axisZ.px, axisZ.py);
      ctx.stroke();

      // 3. Draw Industrial Machinery Holographic Models (Pumps, Switchgears, Pipes, Tanks)
      // Pump Machine 1 (Around x: 10, z: -4)
      const drawPump = (bx: number, bz: number, label: string) => {
        const pTop = project(bx, 1.8, bz);

        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;

        // Base plate
        ctx.beginPath();
        const b1 = project(bx - 1.6, 0, bz - 1.2);
        const b2 = project(bx + 1.6, 0, bz - 1.2);
        const b3 = project(bx + 1.6, 0, bz + 1.2);
        const b4 = project(bx - 1.6, 0, bz + 1.2);
        ctx.moveTo(b1.px, b1.py);
        ctx.lineTo(b2.px, b2.py);
        ctx.lineTo(b3.px, b3.py);
        ctx.lineTo(b4.px, b4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cylinder body
        ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
        ctx.beginPath();
        ctx.arc(pTop.px, pTop.py, 16 * zoomLevel, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = '#bae6fd';
        ctx.font = '10px monospace';
        ctx.fillText(label, pTop.px - 22, pTop.py - 22);
      };

      // Switchgear Cabinets (Around x: -3, z: 2)
      const drawCabinet = (bx: number, bz: number, label: string) => {
        ctx.fillStyle = 'rgba(30, 58, 138, 0.2)';
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1.5;

        const c1 = project(bx - 2, 0, bz - 0.8);
        const c2 = project(bx + 2, 0, bz - 0.8);
        const c3 = project(bx + 2, 0, bz + 0.8);
        const c4 = project(bx - 2, 0, bz + 0.8);
        const ct1 = project(bx - 2, 2.4, bz - 0.8);
        const ct2 = project(bx + 2, 2.4, bz - 0.8);
        const ct3 = project(bx + 2, 2.4, bz + 0.8);
        const ct4 = project(bx - 2, 2.4, bz + 0.8);

        ctx.beginPath();
        ctx.moveTo(c1.px, c1.py);
        ctx.lineTo(c2.px, c2.py);
        ctx.lineTo(c3.px, c3.py);
        ctx.lineTo(c4.px, c4.py);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ct1.px, ct1.py);
        ctx.lineTo(ct2.px, ct2.py);
        ctx.lineTo(ct3.px, ct3.py);
        ctx.lineTo(ct4.px, ct4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Vertical corner lines
        [
          [c1, ct1],
          [c2, ct2],
          [c3, ct3],
          [c4, ct4],
        ].forEach(([b, t]) => {
          ctx.beginPath();
          ctx.moveTo(b.px, b.py);
          ctx.lineTo(t.px, t.py);
          ctx.stroke();
        });

        ctx.fillStyle = '#93c5fd';
        ctx.font = '10px monospace';
        ctx.fillText(label, ct1.px, ct1.py - 8);
      };

      // Pipeline Run
      const drawPipeline = () => {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
        ctx.lineWidth = 3 * zoomLevel;
        const pts = [
          project(10, 1.2, -4),
          project(7, 1.2, -4),
          project(5, 1.2, -5),
          project(0, 1.2, -5),
          project(-5, 1.2, -2),
        ];
        ctx.beginPath();
        ctx.moveTo(pts[0].px, pts[0].py);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].px, pts[i].py);
        }
        ctx.stroke();
      };

      // Render facilities
      drawPump(10, -4, '1# 离心循环主泵');
      drawPump(7, -3, '2# 稳压给水泵');
      drawCabinet(-3, 2, '10kV 配电进线柜组');
      drawPipeline();

      // 4. Draw Issue Spatial Pins
      displayedIssues.forEach((issue) => {
        const pos = project(issue.pos.x, issue.pos.y, issue.pos.z);
        const isHigh = issue.priority === 'HIGH';
        const isMed = issue.priority === 'MEDIUM';
        const isSelected = inspectedIssue?.id === issue.id;

        // Ground shadow dot
        const gPos = project(issue.pos.x, 0, issue.pos.z);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(gPos.px, gPos.py, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stalk line connecting ground to altitude point
        ctx.strokeStyle = isHigh
          ? 'rgba(244, 63, 94, 0.4)'
          : isMed
          ? 'rgba(245, 158, 11, 0.4)'
          : 'rgba(16, 185, 129, 0.4)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(gPos.px, gPos.py);
        ctx.lineTo(pos.px, pos.py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pulsing radar ripple for High priority issues
        if (isHigh) {
          const pulseR = 12 + Math.sin(tick * 3) * 6;
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pos.px, pos.py, pulseR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Selected halo
        if (isSelected) {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.px, pos.py, 16, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Pin marker
        const pinColor = isHigh ? '#f43f5e' : isMed ? '#f59e0b' : '#10b981';
        ctx.fillStyle = pinColor;
        ctx.beginPath();
        ctx.arc(pos.px, pos.py, isSelected ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pin ID Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(issue.id, pos.px + 10, pos.py - 6);
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [displayedIssues, cameraView, zoomLevel, inspectedIssue]);

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-900 text-slate-100 flex flex-col min-h-full">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Box className="w-5 h-5 text-blue-400" />
              <span>数字孪生空间场景管理</span>
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
              Unity 3D 演示视图
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            全息空间点位映射、三维坐标锚定与巡检问题空间反查
          </p>
        </div>

        {/* Scene Zone Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          {['全部', '泵房区', '配电室', '管道区', '其他'].map((zone) => (
            <button
              key={zone}
              onClick={() => setActiveZone(zone)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeZone === zone
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Viewport Box */}
      <div className="relative flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col min-h-[500px] shadow-2xl">
        {/* Floating HUD Top Left: Camera & Coordinate Mode */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-1.5 shadow-lg">
          <button
            onClick={() => setCameraView('iso')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              cameraView === 'iso' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            轴测 3D
          </button>
          <button
            onClick={() => setCameraView('top')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              cameraView === 'top' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            俯视 2D
          </button>
          <button
            onClick={() => setCameraView('front')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              cameraView === 'front' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            正视图
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          <button
            onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="重置视角"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Floating HUD Top Right: Live Sensor Telemetry */}
        {showSensors && (
          <div className="absolute top-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-lg text-xs w-64 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>模拟传感器遥测（未连接）</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center text-slate-300">
                <span>1# 循环机泵外壳温度</span>
                <span className="text-amber-400 font-bold">{simTemp} ℃</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>DN250 管路出口压力</span>
                <span className="text-blue-400 font-bold">{simPressure} MPa</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>配电室 3# 进线电流</span>
                <span className="text-emerald-400 font-bold">142.6 A</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>轴承径向振动幅值</span>
                <span className="text-emerald-400 font-bold">1.82 mm/s</span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Canvas */}
        <div className="flex-1 w-full h-full relative cursor-crosshair">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>

        {/* Bottom Floating Issue Details Card if an issue is selected */}
        {inspectedIssue && (
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-800">
                <img
                  src={inspectedIssue.screenshot}
                  alt={inspectedIssue.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {inspectedIssue.id}
                  </span>
                  <span className="text-sm font-bold text-white">{inspectedIssue.title}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      inspectedIssue.priority === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : inspectedIssue.priority === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {inspectedIssue.priority === 'HIGH'
                      ? '高优先级'
                      : inspectedIssue.priority === 'MEDIUM'
                      ? '中优先级'
                      : '低优先级'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>场景: {inspectedIssue.scene}</span>
                  <span>•</span>
                  <span className="font-mono text-blue-300">
                    Unity 世界坐标: ({inspectedIssue.pos.x}, {inspectedIssue.pos.y}, {inspectedIssue.pos.z})
                  </span>
                  <span>•</span>
                  <span>状态: {inspectedIssue.status === 'OPEN' ? '打开' : inspectedIssue.status === 'IN_PROGRESS' ? '处理中' : '已解决'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectIssue(inspectedIssue)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>在右侧抽屉查看详情</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setInspectedIssue(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {/* Legend Bottom Left */}
        <div className="absolute bottom-4 left-4 z-0 pointer-events-none text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>高优先级隐患</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>中优先级预警</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>低/已处置</span>
          </div>
        </div>
      </div>

      {/* Spatial Points List */}
      <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-4">
        <h3 className="text-xs font-bold text-white mb-3 flex items-center justify-between">
          <span>空间锚点列表 ({displayedIssues.length} 个巡检点位)</span>
          <button
            onClick={onOpenCreateDrawer}
            className="text-blue-400 hover:text-blue-300 text-xs font-medium"
          >
            + 在当前场景添加新点位
          </button>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-48 overflow-y-auto pr-1">
          {displayedIssues.slice(0, 15).map((item) => (
            <div
              key={item.id}
              onClick={() => setInspectedIssue(item)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                inspectedIssue?.id === item.id
                  ? 'bg-blue-600/30 border-blue-500 text-white'
                  : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono font-bold text-blue-400">{item.id}</span>
                <span className="text-[10px] text-slate-400">{item.scene}</span>
              </div>
              <p className="text-xs font-medium text-slate-200 truncate">{item.title}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                ({item.pos.x}, {item.pos.y}, {item.pos.z})
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};
