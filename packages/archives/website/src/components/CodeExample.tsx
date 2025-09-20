interface CodeExampleProps {
  code: string;
  language: string;
}

export default function CodeExample({ code, language }: CodeExampleProps) {
  return (
    <div className="relative">
      <div className="bg-scarcity-dark border border-scarcity-gray/30 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-scarcity-dark-lighter px-4 py-2 border-b border-scarcity-gray/30">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-xs text-gray-400 uppercase font-mono">
            {language}
          </span>
        </div>

        {/* Code content */}
        <div className="p-4 overflow-x-auto">
          <pre className="text-sm">
            <code className="text-gray-300 font-mono leading-relaxed whitespace-pre">
              {code}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
