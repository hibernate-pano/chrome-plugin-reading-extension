import React, { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  className?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  showLineNumbers = true,
  className = '',
}) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      try {
        // 尝试使用指定语言高亮
        const result = hljs.highlight(code, { language, ignoreIllegals: true });
        codeRef.current.innerHTML = result.value;
        codeRef.current.classList.add('hljs');
      } catch (e) {
        // 如果指定语言失败，尝试自动检测
        console.warn(`使用语言 ${language} 高亮失败，尝试自动检测`);
        const result = hljs.highlightAuto(code);
        codeRef.current.innerHTML = result.value;
        codeRef.current.classList.add('hljs');
      }
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 px-2 py-1 text-sm bg-gray-700 text-white rounded
          opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        复制
      </button>
      <pre className={`${showLineNumbers ? 'code-with-line-numbers' : ''} rounded-lg !bg-gray-800 !p-4`}>
        <code ref={codeRef} className={`language-${language}`}>
          {code}
        </code>
        {showLineNumbers && (
          <div className="line-numbers-container">
            {code.split('\n').map((_, i) => (
              <span key={i} className="line-number">{i + 1}</span>
            ))}
          </div>
        )}
      </pre>
    </div>
  );
};

export default CodeBlock;