import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Download } from 'lucide-react';

interface MermaidProps {
  chart: string;
  title?: string;
  toolbar?: boolean;
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'ui-monospace, monospace',
});

export function Mermaid({ chart, title, toolbar = true }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [svgContent, setSvgContent] = useState('');

  useEffect(() => {
    if (containerRef.current) {
      const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      mermaid.render(uniqueId, chart).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setSvgContent(svg);
        }
      }).catch((error) => {
        console.error('Mermaid rendering error:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="text-red-400 p-4">Error rendering diagram: ${error.message}</div>`;
        }
      });
    }
  }, [chart]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPNG = () => {
    if (!svgContent) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${title || 'diagram'}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };
    
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  };

  const handleExportSVG = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'diagram'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {toolbar && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex items-center space-x-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleExportPNG}
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>PNG</span>
            </button>
            <button
              onClick={handleExportSVG}
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>SVG</span>
            </button>
          </div>
        </div>
      )}
      <div 
        ref={containerRef} 
        className="p-6 flex items-center justify-center min-h-[300px] [&_svg]:max-w-full [&_svg]:h-auto"
      />
    </div>
  );
}
