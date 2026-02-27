# 📅 היומן שלי

אפליקציית יומן אישי עם Next.js, Tailwind CSS ו-Vercel KV.

## 🚀 הוראות פריסה ב-Vercel

### שלב 1 - Push ל-GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### שלב 2 - צור פרויקט ב-Vercel
1. כנס ל-vercel.com והתחבר עם GitHub
2. לחץ **Add New → Project**
3. בחר את הריפו שיצרת ולחץ **Deploy**

### שלב 3 - צור Vercel KV Store
1. בפרויקט ב-Vercel, עבור ל-**Storage** tab
2. לחץ **Create Database → KV**
3. לחץ **Connect to Project** — ה-ENV variables יתווספו אוטומטית!

### שלב 4 - הגדר Environment Variables
ב-Vercel → **Settings → Environment Variables**:

| שם | ערך |
|---|---|
| NEXTAUTH_SECRET | מחרוזת רנדומלית ארוכה |
| NEXTAUTH_URL | כתובת האתר (https://your-app.vercel.app) |
| ADMIN_USERNAME | שם המשתמש שלך |
| ADMIN_PASSWORD | סיסמה חזקה |

### שלב 5 - Redeploy
Deployments → לחץ **Redeploy** על הדיפלוי האחרון.

---

## 💻 הרצה מקומית

```bash
cp .env.example .env.local
# ערוך .env.local עם הערכים שלך

# קישור ל-Vercel KV (מומלץ):
npm install -g vercel
vercel login && vercel link
vercel env pull .env.local

npm install
npm run dev
```

---

## 📱 שימוש
- **כניסה**: עם שם משתמש וסיסמה שהגדרת ב-ENV
- **🎯 בריכת פעילויות**: לחץ על 🎯 בפינה לפתיחה/סגירה
- **+ הוסף**: הוספת פעילות חדשה עם שם/תיאור/משך/צבע
- **Drag & Drop**: גרור פעילות מהבריכה לתאריך ביומן
- **i**: לחיצה על עיגול i מציגה את תיאור הפעילות
- **×**: מחיקת פעילות או אירוע
- **נקה הכל**: מחיקת כל הבריכה
- **‹ ›**: ניווט קדימה/אחורה בזמן
- **היום**: חזרה לתאריך הנוכחי
