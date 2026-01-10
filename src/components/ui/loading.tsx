import React from 'react';

/**
 * 骨架屏组件 - 用于内容加载时的占位
 */
export const SkeletonLoader: React.FC<{ lines?: number }> = ({ lines = 5 }) => {
  return (
    <div className="skeleton-loader" style={{ padding: '20px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '16px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-loading 1.5s ease-in-out infinite',
            borderRadius: '4px',
            marginBottom: '12px',
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
      <style>
        {`
          @keyframes skeleton-loading {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}
      </style>
    </div>
  );
};

/**
 * 平滑的加载微调器
 */
export const LoadingSpinner: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = '#3b82f6',
}) => {
  return (
    <div
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        border: `3px solid ${color}20`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

/**
 * 全屏加载覆盖层
 */
export const LoadingOverlay: React.FC<{ message?: string }> = ({
  message = '加载中...',
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <LoadingSpinner size={50} />
      <p
        style={{
          marginTop: '20px',
          color: '#6b7280',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        {message}
      </p>
    </div>
  );
};
