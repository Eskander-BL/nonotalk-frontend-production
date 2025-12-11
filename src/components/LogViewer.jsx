import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Copy, Trash2 } from 'lucide-react'

/**
 * Composant pour afficher les logs de l'application
 * Utile pour déboguer sur mobile sans accès à DevTools
 */
export function LogViewer() {
  const [logs, setLogs] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('all') // all, error, warn, info

  // Capturer les logs console
  useEffect(() => {
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const originalInfo = console.info

    const addLog = (type, args) => {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      }).join(' ')

      setLogs(prev => [...prev, {
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + Math.random()
      }])
    }

    console.log = (...args) => {
      originalLog(...args)
      addLog('log', args)
    }

    console.error = (...args) => {
      originalError(...args)
      addLog('error', args)
    }

    console.warn = (...args) => {
      originalWarn(...args)
      addLog('warn', args)
    }

    console.info = (...args) => {
      originalInfo(...args)
      addLog('info', args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
      console.info = originalInfo
    }
  }, [])

  // Filtrer les logs
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.type === filter)

  // Copier les logs
  const copyLogs = () => {
    const text = filteredLogs
      .map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    alert('Logs copiés dans le presse-papiers !')
  }

  // Effacer les logs
  const clearLogs = () => {
    setLogs([])
  }

  // Compter les erreurs
  const errorCount = logs.filter(log => log.type === 'error').length
  const warnCount = logs.filter(log => log.type === 'warn').length

  return (
    <>
      {/* Bouton pour ouvrir le LogViewer */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold z-50 flex items-center gap-2"
      >
        🐛 Logs
        {errorCount > 0 && (
          <span className="bg-white text-red-500 px-2 py-1 rounded font-bold">
            {errorCount}
          </span>
        )}
      </button>

      {/* Panel des logs */}
      {isOpen && (
        <Card className="fixed bottom-16 right-4 w-96 max-h-96 z-50 bg-gray-900 text-white border-gray-700 flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
            <div className="font-bold text-sm">
              Logs ({filteredLogs.length})
              {errorCount > 0 && <span className="text-red-400 ml-2">❌ {errorCount} erreurs</span>}
              {warnCount > 0 && <span className="text-yellow-400 ml-2">⚠️ {warnCount} avertissements</span>}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Filtres */}
          <div className="bg-gray-800 p-2 border-b border-gray-700 flex gap-2">
            {['all', 'error', 'warn', 'info'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-xs rounded ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'Tous' : f === 'error' ? '❌ Erreurs' : f === 'warn' ? '⚠️ Avertissements' : 'ℹ️ Info'}
              </button>
            ))}
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">Aucun log</div>
            ) : (
              filteredLogs.map(log => (
                <div
                  key={log.id}
                  className={`p-1 rounded ${
                    log.type === 'error'
                      ? 'bg-red-900 text-red-200'
                      : log.type === 'warn'
                      ? 'bg-yellow-900 text-yellow-200'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  <span className="text-gray-500">[{log.timestamp}]</span>
                  {' '}
                  <span className="font-bold">
                    {log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : 'ℹ️'}
                  </span>
                  {' '}
                  <span className="break-words">{log.message}</span>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-800 p-2 border-t border-gray-700 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyLogs}
              className="flex-1 text-xs"
            >
              <Copy size={14} /> Copier
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearLogs}
              className="flex-1 text-xs"
            >
              <Trash2 size={14} /> Effacer
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}
