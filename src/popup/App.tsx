import { useEffect, useState } from 'react'
import { getNotifications, clearNotifications, type StoredNotification } from '../lib/notification-handler'
import { getFCMToken, getTokenInfo, setupForegroundMessageHandler, clearToken } from '../lib/firebase'
import { signIn, signOut, getCurrentSession, type AuthUser } from '../lib/auth'

interface TokenInfo {
  token: string | null
  timestamp: number | null
  deviceId: string | null
}

type View = 'loading' | 'sign-in' | 'main'

export function App() {
  const [view, setView] = useState<View>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')

  // Sign-in form state
  const [email, setEmail] = useState('nir.m@popai.health')
  const [password, setPassword] = useState('13DF24ac!')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadNotifications()
      loadTokenInfo()
      setupForegroundHandler()
    }
  }, [user])

  async function checkAuth() {
    try {
      const session = await getCurrentSession()
      if (session) {
        setUser(session)
        setView('main')
      } else {
        setView('sign-in')
      }
    } catch {
      setView('sign-in')
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const authUser = await signIn(email, password)
      setUser(authUser)
      setView('main')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    setUser(null)
    setTokenInfo(null)
    setNotifications([])
    setView('sign-in')
  }

  async function loadNotifications() {
    const data = await getNotifications()
    setNotifications(data)
  }

  async function loadTokenInfo() {
    const info = await getTokenInfo()
    setTokenInfo(info)
  }

  async function setupForegroundHandler() {
    await setupForegroundMessageHandler((payload) => {
      chrome.runtime.sendMessage({ type: 'SHOW_NOTIFICATION', ...payload })
      setTimeout(loadNotifications, 500)
    })
  }

  async function handleEnableNotifications() {
    if (!user) return

    setLoading(true)
    setSyncStatus('syncing')
    setError(null)

    try {
      // Get push subscription
      const subscription = await getFCMToken()
      if (!subscription) {
        throw new Error('Failed to get notification token')
      }

      // Log for manual testing - copy this to send a test notification
      console.log('[PopAI] ===== PUSH SUBSCRIPTION FOR TESTING =====')
      console.log(subscription)
      console.log('[PopAI] ==========================================')

      setSyncStatus('synced')
      await loadTokenInfo()
    } catch (err) {
      console.error('[PopAI] Failed to enable notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to enable notifications')
      setSyncStatus('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    await clearNotifications()
    setNotifications([])
  }

  async function handleTestNotification() {
    await chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' })
    setTimeout(loadNotifications, 500)
  }

  async function handleCopyToken() {
    if (tokenInfo?.token) {
      await navigator.clipboard.writeText(tokenInfo.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleResetToken() {
    await clearToken()
    setTokenInfo(prev => prev ? { ...prev, token: null, timestamp: null } : null)
    setSyncStatus('idle')
    setError(null)
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  }

  // Loading view
  if (view === 'loading') {
    return (
      <div className="w-96 min-h-64 bg-white p-4 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Sign-in view
  if (view === 'sign-in') {
    return (
      <div className="w-96 min-h-64 bg-white p-4">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">PopAI Notifications</h1>
        <p className="text-sm text-gray-600 mb-4">
          Sign in with your PopAI account to receive notifications.
        </p>

        <form onSubmit={handleSignIn} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="********"
              required
            />
          </div>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    )
  }

  // Main view
  return (
    <div className="w-96 min-h-64 bg-white p-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">PopAI Notifications</h1>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleTestNotification}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Push Notification Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">Push Notifications</span>
          <div className="flex gap-1">
            {tokenInfo?.token && (
              <button
                onClick={() => setShowToken(!showToken)}
                className="text-xs px-2 py-0.5 text-gray-600 hover:bg-gray-200 rounded"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            )}
            <button
              onClick={handleEnableNotifications}
              disabled={loading}
              className="text-xs px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
            >
              {loading ? 'Enabling...' : tokenInfo?.token ? 'Refresh' : 'Enable'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}

        {tokenInfo?.token ? (
          <>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-xs text-green-700">
                {syncStatus === 'synced' ? 'Enabled & synced' : 'Enabled'}
              </span>
            </div>
            {showToken && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 break-all font-mono bg-white p-2 rounded border max-h-20 overflow-y-auto">
                  {tokenInfo.token}
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleCopyToken}
                    className="flex-1 text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    {copied ? 'Copied!' : 'Copy Token'}
                  </button>
                  <button
                    onClick={handleResetToken}
                    className="flex-1 text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span className="text-xs text-yellow-700">Not enabled - click Enable</span>
          </div>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <p>No notifications yet</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-medium text-gray-900 text-sm">{notification.title}</h3>
                <p className="text-gray-600 text-xs mt-1">{notification.body}</p>
                <p className="text-gray-400 text-xs mt-2">{formatTime(notification.timestamp)}</p>
                {notification.url && (
                  <a
                    href={notification.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-xs hover:underline mt-1 block"
                  >
                    Open link
                  </a>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={handleClear}
            className="mt-4 w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            Clear all notifications
          </button>
        </>
      )}
    </div>
  )
}
