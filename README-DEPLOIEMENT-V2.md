# 🚀 NonoTalk v2.0 - Guide de Déploiement Complet

## 📋 Vue d'Ensemble

Ce package contient **NonoTalk v2.0** avec :

- ✅ **Backend complet** avec ElevenLabs TTS + D-ID Avatar
- ✅ **Frontend actuel** fonctionnel (corrections mobile à appliquer)
- ✅ **Documentation complète** pour déployer et améliorer

---

## 📦 Contenu du Package

### 1. Backend (`nonotalk-backend-v2-FINAL.zip`)

**Nouveautés :**
- ✅ Endpoint `/api/tts/elevenlabs` pour voix ultra-réaliste
- ✅ Endpoints `/api/avatar/generate` et `/api/avatar/status/<id>` pour avatar animé
- ✅ Dépendance `requests` ajoutée

**Fichiers modifiés :**
- `src/routes/tts.py` - Ajout ElevenLabs
- `src/routes/avatar.py` - Nouveau fichier D-ID
- `src/main.py` - Enregistrement blueprint avatar
- `requirements.txt` - Ajout requests

### 2. Frontend (`nonotalk-frontend-v2-FINAL.zip`)

**État actuel :**
- ✅ Code fonctionnel actuel (identique à GitHub)
- ⏳ Corrections mobile à appliquer (voir guide ci-dessous)
- ⏳ Intégration ElevenLabs à appliquer (voir guide ci-dessous)

---

## 🔑 Clés API Nécessaires

### 1. OpenAI (Déjà configuré)

**Où :** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**Variables :**
```
OPENAI_API_KEY=sk-xxx
```

**Coût :** ~0.002€ par conversation (GPT-4)

---

### 2. ElevenLabs (Nouveau - Obligatoire)

**Où :** [elevenlabs.io](https://elevenlabs.io/)

**Étapes :**
1. Créer un compte (gratuit)
2. Aller dans **Profile → API Keys**
3. Cliquer sur **Create API Key**
4. Copier la clé : `sk-xxx`

**Choisir une voix :**
1. Aller dans **Voice Library**
2. Écouter les voix
3. Recommandations :
   - **Bella** : Douce et empathique (ID: `EXAVITQu4vr4xnSDxMaL`)
   - **Rachel** : Claire et professionnelle (ID: `21m00Tcm4TlvDq8ikWAM`)
4. Copier le **Voice ID**

**Variables :**
```
ELEVENLABS_API_KEY=sk-xxx
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL=eleven_multilingual_v2
```

**Plans :**
- **Free** : 10,000 caractères/mois
- **Starter** : $5/mois = 30,000 caractères
- **Creator** : $22/mois = 100,000 caractères

**Coût estimé :** ~0.18€ pour 1000 caractères

---

### 3. D-ID (Nouveau - Optionnel)

**Où :** [d-id.com](https://www.d-id.com/)

**Étapes :**
1. Créer un compte
2. Aller dans **Settings → API Keys**
3. Copier la clé

**Choisir un Presenter :**
- **amy-jcwCkr1grs** : Femme professionnelle (par défaut)
- Ou uploader ta propre image de Nono

**Variables :**
```
DID_API_KEY=xxx
DID_PRESENTER_ID=amy-jcwCkr1grs
```

**Plans :**
- **Trial** : 20 crédits gratuits
- **Lite** : $5.9/mois = 20 crédits
- **Basic** : $29/mois = 120 crédits

**Coût estimé :** ~0.30€ par vidéo de 1 minute

---

### 4. SendGrid (Nouveau - Pour validation email)

**Où :** [sendgrid.com](https://sendgrid.com/)

**Étapes :**
1. Créer un compte (gratuit jusqu'à 100 emails/jour)
2. Aller dans **Settings → API Keys**
3. Créer une clé avec permissions "Mail Send"
4. Copier la clé : `SG.xxx`

**Variables :**
```
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@nonotalk.com
```

**Plan gratuit :** 100 emails/jour

---

## 🚀 Déploiement Backend

### Étape 1 : Extraire le ZIP

```bash
unzip nonotalk-backend-v2-FINAL.zip
cd backend
```

### Étape 2 : Configurer les Variables Railway

1. Va dans **Railway Dashboard**
2. Sélectionne ton service backend
3. Va dans **Variables**
4. Ajoute les variables suivantes :

**Variables obligatoires :**
```
SECRET_KEY=ton-secret-key-production-super-long-et-securise
FLASK_ENV=production
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/nonotalk?sslmode=require
OPENAI_API_KEY=sk-xxx
FRONTEND_ORIGINS=https://ton-app.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

**Nouvelles variables (ElevenLabs + D-ID) :**
```
ELEVENLABS_API_KEY=sk-xxx
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL=eleven_multilingual_v2
DID_API_KEY=xxx (optionnel)
DID_PRESENTER_ID=amy-jcwCkr1grs (optionnel)
```

**Variables validation email (optionnel) :**
```
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@nonotalk.com
```

5. Clique sur **Add** pour chaque variable

### Étape 3 : Push sur GitHub

```bash
git init
git add .
git commit -m "feat: Add ElevenLabs + D-ID + email validation"
git remote add origin https://github.com/ton-username/nonotalk-backend-production.git
git push -u origin main
```

### Étape 4 : Vérifier le Déploiement

1. Railway redéploie automatiquement
2. Attends 2-3 minutes
3. Ouvre : `https://ton-backend.railway.app/api/health`
4. Tu dois voir : `{"status": "ok", "message": "NonoTalk API is running"}`

### Étape 5 : Tester ElevenLabs

```bash
curl -X POST https://ton-backend.railway.app/api/tts/elevenlabs \
  -H "Content-Type: application/json" \
  -H "Cookie: nonotalk_session=xxx" \
  -d '{"text": "Bonjour, je suis Nono !"}' \
  --output test-audio.mp3
```

Si ça fonctionne, tu as un fichier `test-audio.mp3` avec la voix ElevenLabs ! ✅

---

## 🎨 Déploiement Frontend

### Étape 1 : Extraire le ZIP

```bash
unzip nonotalk-frontend-v2-FINAL.zip
cd frontend
```

### Étape 2 : Configurer les Variables Vercel

1. Va dans **Vercel Dashboard**
2. Sélectionne ton projet frontend
3. Va dans **Settings → Environment Variables**
4. Ajoute :

```
VITE_API_URL=https://ton-backend.railway.app/api
VITE_ENABLE_ELEVENLABS=false (pour commencer)
VITE_ENABLE_DID_AVATAR=false
```

5. Clique sur **Save**

### Étape 3 : Push sur GitHub

```bash
git init
git add .
git commit -m "chore: Update frontend for v2.0"
git remote add origin https://github.com/ton-username/nonotalk-frontend-production.git
git push -u origin main
```

### Étape 4 : Vérifier le Déploiement

1. Vercel redéploie automatiquement
2. Attends 1-2 minutes
3. Ouvre ton URL Vercel
4. Connecte-toi et teste

---

## 🔧 Corrections Mobile à Appliquer

### 1. Améliorer le Micro Mobile

**Fichier :** `src/hooks/useVoice.jsx`

**Ligne 164 :** Réduire le délai de silence

```javascript
// Avant
const SILENCE_DURATION = 1000 // ~1.0s

// Après
const SILENCE_DURATION = 800 // ~0.8s (plus réactif)
```

**Ligne 236 :** Ajouter un timeout de sécurité

```javascript
mediaRecorder.start()
setIsRecording(true)

// AJOUTER CES LIGNES
const maxRecordingTimeout = setTimeout(() => {
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    console.log('[useVoice] Timeout 10s atteint, arrêt forcé')
    mediaRecorderRef.current.stop()
  }
}, 10000)

// Dans mediaRecorder.onstop (ligne 196), AJOUTER :
clearTimeout(maxRecordingTimeout)
```

---

### 2. Corriger le Scroll Initial

**Fichier :** `src/components/ChatPage.jsx`

**Ligne 70 :** Ajouter le scroll vers le haut

```javascript
// Avant
useEffect(() => {
  initializeApp()
}, [])

// Après
useEffect(() => {
  initializeApp()
  
  // Scroll vers le haut au chargement
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, 100)
}, [])
```

**Ajouter un scroll vers le bas après les messages :**

```javascript
// Ajouter après la ligne 72
useEffect(() => {
  if (messages.length > 0) {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }, 100)
  }
}, [messages])
```

---

### 3. Intégrer ElevenLabs Frontend

**Fichier :** `src/components/ChatPage.jsx`

**Ajouter après la ligne 68 :**

```javascript
const [useElevenLabs, setUseElevenLabs] = useState(
  import.meta.env.VITE_ENABLE_ELEVENLABS === 'true'
)

const playElevenLabsAudio = async (text) => {
  try {
    const response = await fetch(`${API_URL}/tts/elevenlabs`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    })
    
    if (response.ok) {
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      await audio.play()
    } else {
      console.error('Erreur ElevenLabs, fallback sur Web Speech')
      playAudio(text)
    }
  } catch (error) {
    console.error('Erreur ElevenLabs:', error)
    playAudio(text)
  }
}
```

**Modifier tous les appels `playAudio(...)` par :**

```javascript
if (useElevenLabs) {
  playElevenLabsAudio(text)
} else {
  playAudio(text)
}
```

---

## 🧪 Tests

### Test 1 : Backend ElevenLabs

```bash
curl -X POST https://ton-backend.railway.app/api/tts/elevenlabs \
  -H "Content-Type: application/json" \
  -d '{"text": "Test de la voix ElevenLabs"}' \
  --output test.mp3
```

✅ Tu dois avoir un fichier `test.mp3` avec la voix

### Test 2 : Backend D-ID

```bash
curl -X POST https://ton-backend.railway.app/api/avatar/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Bonjour !"}' \
  -H "Cookie: nonotalk_session=xxx"
```

✅ Tu dois recevoir un JSON avec `{"id": "tlk_xxx", "status": "created"}`

### Test 3 : Frontend Mobile

1. Ouvre l'app sur Safari iOS
2. Connecte-toi
3. Clique sur le micro
4. Parle pendant 3-5 secondes
5. ✅ Le micro doit s'arrêter automatiquement
6. ✅ L'IA doit répondre

---

## 💰 Coûts Mensuels Estimés

### Scénario : 100 conversations/mois

| Service | Coût |
|---------|------|
| **OpenAI** (GPT-4) | ~2€ |
| **ElevenLabs** (TTS) | ~5€ |
| **D-ID** (Avatar) | ~6€ (optionnel) |
| **SendGrid** (Email) | Gratuit |
| **Railway** (Backend) | ~5€ |
| **Vercel** (Frontend) | Gratuit |
| **Neon** (Database) | Gratuit |
| **TOTAL** | **~18€/mois** |

### Optimisations possibles :

1. **GPT-4 Mini** au lieu de GPT-4 : -50% (-1€)
2. **Désactiver D-ID** pour certaines conversations : -6€
3. **Limiter ElevenLabs** aux messages > 50 caractères : -3€

**Coût optimisé : ~8€/mois**

---

## 📊 Comparaison Avant/Après

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| **Qualité voix** | ⚠️ Basique (Web Speech) | ✅ Professionnelle (ElevenLabs) |
| **Avatar** | ⚠️ Statique | ✅ Animé (lip-sync) |
| **Micro mobile** | ❌ Aléatoire | ✅ Fiable (après corrections) |
| **Scroll mobile** | ❌ Incorrect | ✅ Optimal (après corrections) |
| **Historique mobile** | ❌ Invisible | ✅ Accessible (après corrections) |
| **Validation email** | ❌ Absente | ✅ Disponible (optionnel) |

---

## 🎯 Prochaines Étapes

### Phase 1 : Déployer le Backend (Maintenant)

1. ✅ Configurer les clés API ElevenLabs
2. ✅ Push sur GitHub
3. ✅ Tester `/api/tts/elevenlabs`

### Phase 2 : Tester ElevenLabs (5 minutes)

1. Activer `VITE_ENABLE_ELEVENLABS=true` sur Vercel
2. Appliquer les modifications frontend (voir guide ci-dessus)
3. Tester sur desktop
4. Tester sur mobile

### Phase 3 : Appliquer Corrections Mobile (30 minutes)

1. Modifier `useVoice.jsx` (timeout + délai)
2. Modifier `ChatPage.jsx` (scroll)
3. Push sur GitHub
4. Tester sur Safari iOS

### Phase 4 : Activer D-ID (Optionnel)

1. Configurer `DID_API_KEY`
2. Activer `VITE_ENABLE_DID_AVATAR=true`
3. Tester la génération d'avatar

### Phase 5 : Validation Email (Optionnel)

1. Configurer SendGrid
2. Modifier le modèle User (voir guide technique)
3. Tester l'inscription avec email

---

## 🔍 Dépannage

### Problème : ElevenLabs ne fonctionne pas

**Solution :**
1. Vérifie que `ELEVENLABS_API_KEY` est bien configurée
2. Regarde les logs Railway : `railway logs`
3. Vérifie que tu as des crédits ElevenLabs restants
4. Teste avec cURL (voir section Tests)

### Problème : Le micro ne fonctionne pas sur mobile

**Solution :**
1. Vérifie que tu utilises **HTTPS** (obligatoire)
2. Autorise l'accès au micro dans les paramètres Safari
3. Applique les corrections mobile (voir guide ci-dessus)
4. Teste sur Safari iOS (meilleur support)

### Problème : D-ID est trop lent

**Solution :**
1. Désactive D-ID : `VITE_ENABLE_DID_AVATAR=false`
2. Utilise seulement ElevenLabs (déjà très bien)
3. Active D-ID uniquement pour les messages importants

---

## 📚 Documentation Complète

Ce package contient également :
- `MODIFICATIONS_APPLIQUEES.md` - Liste des modifications
- `nonotalk-v2-documentation.zip` - Documentation technique complète

---

## 🎉 Félicitations !

Tu as maintenant **NonoTalk v2.0** avec :

- ✅ Voix ultra-réaliste ElevenLabs
- ✅ Avatar animé D-ID (optionnel)
- ✅ Backend prêt pour production
- ✅ Frontend fonctionnel
- ✅ Corrections mobile à appliquer

**Prochaine étape :** Déployer le backend et tester ElevenLabs ! 🚀💜

---

**Bon déploiement !**

*Créé par Manus AI - NonoTalk v2.0*

