import { useState, useRef } from 'react'
import { Button } from 'components/ui/button'
import { Input } from 'components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import { Label } from 'components/ui/label'
import { Heart, User, Lock, Mail, Gift } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import logoImage from '../assets/logo.png'

export default function SignupPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [registerErrors, setRegisterErrors] = useState({ username: '', email: '', pin: '', general: '' })
  const [success, setSuccess] = useState('')

  // Refs pour focaliser le premier champ en erreur
  const regUsernameRef = useRef(null)
  const regEmailRef = useRef(null)
  const regPinRef = useRef(null)

  // États pour l'inscription
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    pin: '',
    parrain_email: ''
  })

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setRegisterErrors({ username: '', email: '', pin: '', general: '' })
    setSuccess('')

    // Validations côté client
    if (!registerData.username || !registerData.pin || !registerData.email || !registerData.email.trim()) {
      const errs = { username: '', email: '', pin: '', general: '' }
      if (!registerData.username) errs.username = 'Obligatoire'
      if (!registerData.email || !registerData.email.trim()) errs.email = 'Le champ email est obligatoire'
      if (!registerData.pin) errs.pin = 'Obligatoire'
      setRegisterErrors(errs)
      // Focus sur le premier champ en erreur
      if (errs.username) regUsernameRef.current?.focus()
      else if (errs.email) regEmailRef.current?.focus()
      else if (errs.pin) regPinRef.current?.focus()
      setIsLoading(false)
      return
    }

    if (registerData.pin.length !== 4) {
      setRegisterErrors({ username: '', email: '', pin: 'Le PIN doit contenir 4 chiffres', general: '' })
      regPinRef.current?.focus()
      setIsLoading(false)
      return
    }

    const result = await register(
      registerData.username,
      registerData.email.trim(),
      registerData.pin,
      registerData.parrain_email
    )

    if (result.success) {
      // Afficher le message de succès avec bonus
      if (result.bonus_quota > 0) {
        setSuccess(`Inscription réussie ! 🎉 Bonus parrainage : +${result.bonus_quota} échanges offerts`)
      } else {
        setSuccess('Inscription réussie ! Vous pouvez maintenant commencer à discuter avec Nono.')
      }
      
      // Redirection automatique après 2 secondes
      setTimeout(() => {
        navigate('/chat')
      }, 2000)
    } else {
      const msg = result.error || "Erreur d'inscription"
      const lower = msg.toLowerCase()
      if (lower.includes('utilisateur') || lower.includes("nom d'utilisateur")) {
        setRegisterErrors({ username: "Ce nom d'utilisateur existe déjà", email: '', pin: '', general: '' })
        regUsernameRef.current?.focus()
      } else if (lower.includes('email')) {
        setRegisterErrors({ username: '', email: 'Cet email est déjà utilisé', pin: '', general: '' })
        regEmailRef.current?.focus()
      } else {
        setRegisterErrors({ username: '', email: '', pin: '', general: msg })
      }
    }

    setIsLoading(false)
  }

  const handlePinInput = (value) => {
    // Ne garder que les chiffres et limiter à 4
    const numericValue = value.replace(/\\D/g, '').slice(0, 4)
    setRegisterData(prev => ({ ...prev, pin: numericValue }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-lg">
              <img 
                src={logoImage} 
                alt="NonoTalk Logo" 
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">NonoTalk</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Nono, toujours là pour t'écouter
            </CardDescription>
          </div>

          {/* Message d'invitation */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-purple-900">
                  ✨ Tu as été invité sur NonoTalk ✨
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Profite de <span className="font-bold">+5 échanges offerts</span> en créant ton compte
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {registerErrors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {registerErrors.general}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm animate-pulse">
              {success}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-username" className="text-sm font-medium text-gray-700">
                Nom d'utilisateur *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="reg-username"
                  type="text"
                  placeholder="Ton nom d'utilisateur"
                  value={registerData.username}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                  disabled={isLoading}
                  ref={regUsernameRef}
                  className={`pl-10 ${registerErrors.username ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  aria-invalid={!!registerErrors.username}
                  aria-describedby="reg-username-error"
                />
              </div>
              {registerErrors.username && (
                <p id="reg-username-error" className="text-xs text-red-600 mt-1">{registerErrors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-sm font-medium text-gray-700">
                Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="ton@email.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isLoading}
                  required
                  ref={regEmailRef}
                  className={`pl-10 ${registerErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  aria-invalid={!!registerErrors.email}
                  aria-describedby="reg-email-error"
                />
              </div>
              {registerErrors.email && (
                <p id="reg-email-error" className="text-xs text-red-600 mt-1">{registerErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-pin" className="text-sm font-medium text-gray-700">
                Code PIN (4 chiffres) *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="reg-pin"
                  type="password"
                  placeholder="••••"
                  value={registerData.pin}
                  onChange={(e) => handlePinInput(e.target.value)}
                  disabled={isLoading}
                  ref={regPinRef}
                  className={`pl-10 text-center text-lg tracking-widest ${registerErrors.pin ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  maxLength={4}
                  aria-invalid={!!registerErrors.pin}
                  aria-describedby="reg-pin-error"
                />
              </div>
              {registerErrors.pin && (
                <p id="reg-pin-error" className="text-xs text-red-600 mt-1">{registerErrors.pin}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-105 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? 'Création du compte...' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              Déjà un compte ?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
              >
                Se connecter
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}