import React from 'react';
import { X, ExternalLink, MapPin } from 'lucide-react';
import type { Issue } from '../types';
import { formatApiDateTime } from '../utils/date';

interface ImageLightboxModalProps {
  issue: Issue | null;
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  issue,
  imageUrl,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-600/30 text-blue-400 border border-blue-500/30">
              {issue?.id || '截图预览'}
            </span>
            <span className="font-medium text-sm text-slate-200">
              {issue?.title || '现场巡检抓拍图片'}
            </span>
            {issue?.scene && (
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                {issue.scene}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="新窗口打开原图"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Display Area */}
        <div className="relative flex-1 bg-black/60 flex items-center justify-center p-4 overflow-hidden min-h-[400px]">
          <img
            src={imageUrl}
            alt="巡检抓拍截图"
            className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg select-none"
          />

          {/* Coordinate Watermark HUD */}
          {issue?.pos && (
            <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono flex items-center gap-2 shadow-lg">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                Unity 世界坐标: X: {issue.pos.x}, Y: {issue.pos.y}, Z: {issue.pos.z}
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div>
            <span>
              拍摄时间: {issue ? formatApiDateTime(issue.createdAt) : '未知'}
            </span>
            <span className="mx-2">•</span>
            <span>分辨率: 1920 × 1080 (数字孪生高清视口快照)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
