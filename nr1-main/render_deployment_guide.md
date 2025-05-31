# دليل نشر موقع Viral Clip Generator على منصة Render.com

## مقدمة

هذا الدليل يشرح كيفية نشر موقع Viral Clip Generator على منصة Render.com بخطوات بسيطة ومباشرة.

## متطلبات النشر

1. حساب على منصة Render.com
2. حساب GitHub (اختياري، لكنه مفضل للنشر التلقائي)

## خطوات النشر

### 1. تحميل الكود إلى GitHub (اختياري ولكن موصى به)

1. قم بإنشاء مستودع جديد على GitHub
2. قم برفع جميع ملفات المشروع إلى المستودع
3. تأكد من رفع ملفات `package.json` و `render.yaml` و `server.js`

### 2. إنشاء خدمة جديدة على Render.com

1. قم بتسجيل الدخول إلى حسابك على Render.com
2. انقر على زر "New" واختر "Web Service"
3. اختر "Build and deploy from a Git repository" إذا كنت استخدمت GitHub
4. أو اختر "Upload Files" إذا كنت تريد رفع الملفات مباشرة

### 3. تكوين الخدمة

إذا كنت تستخدم GitHub:
1. اختر المستودع الذي رفعت إليه الكود
2. سيتم اكتشاف ملف `render.yaml` تلقائياً وتكوين الخدمة

إذا كنت ترفع الملفات مباشرة:
1. قم بتعيين الإعدادات التالية:
   - **Name**: viral-clip-generator
   - **Environment**: Node
   - **Build Command**: npm install
   - **Start Command**: node server.js
   - **Health Check Path**: /health

### 4. إعداد المتغيرات البيئية

قم بإضافة المتغيرات البيئية التالية:
- **NODE_ENV**: production

### 5. إعداد التخزين المستمر

1. انتقل إلى قسم "Disks" في إعدادات الخدمة
2. قم بإضافة قرص جديد:
   - **Name**: viral-clips-data
   - **Mount Path**: /opt/render/project/src/videos
   - **Size**: 1 GB (يمكن زيادته حسب الحاجة)

### 6. بدء النشر

1. انقر على زر "Create Web Service"
2. انتظر حتى اكتمال عملية البناء والنشر
3. ستحصل على رابط للموقع المنشور (مثال: https://viral-clip-generator.onrender.com)

## اختبار الموقع بعد النشر

1. افتح الرابط الذي حصلت عليه من Render
2. تأكد من أن الصفحة الرئيسية تظهر بشكل صحيح
3. جرب إدخال رابط فيديو YouTube والنقر على زر "Make Viral!"
4. تأكد من أن معاينة الفيديو وتنزيله يعملان بشكل صحيح

## استكشاف الأخطاء وإصلاحها

إذا واجهت أي مشاكل:
1. تحقق من سجلات الخدمة في لوحة تحكم Render
2. تأكد من أن جميع المتغيرات البيئية مضبوطة بشكل صحيح
3. تأكد من أن قرص التخزين المستمر تم تكوينه بشكل صحيح

## تحديث الموقع

لتحديث الموقع بعد النشر:
1. إذا كنت تستخدم GitHub، ما عليك سوى دفع التغييرات إلى المستودع وسيتم النشر تلقائياً
2. إذا كنت ترفع الملفات مباشرة، قم بتحديث الملفات من خلال لوحة تحكم Render

## ملاحظات إضافية

- يمكنك ضبط إعدادات النطاق الترددي والذاكرة من لوحة تحكم Render حسب احتياجاتك
- للحصول على أداء أفضل، يمكنك الترقية إلى خطة مدفوعة على Render
- تأكد من مراقبة استخدام الموارد لتجنب أي رسوم إضافية

# Deployment Guide for nr1copilot

This guide will help you deploy the Viral Clip Generator in a production environment.

## 1. Prerequisites
- Node.js v14 or higher
- npm
- FFmpeg (system-wide, or use the included installer)
- Linux server (recommended)
- HTTPS (recommended for public deployment)

## 2. Environment Setup

### Install dependencies
```bash
cd nr1copilot/nr1-main
npm install
```

### Set environment variables (optional)
- `PORT`: The port the server will run on (default: 5000)
- `NODE_ENV`: Set to `production` for production mode

## 3. Running the Server

### Development
```bash
npm run dev
```

### Production (recommended)
Install PM2 if not already installed:
```bash
npm install -g pm2
```
Start the server with PM2:
```bash
pm2 start server.js --name viral-clip-generator
```

## 4. HTTPS Setup
If deploying publicly, use a reverse proxy (like Nginx) to enable HTTPS.

## 5. File Storage
- Processed and temporary videos are stored in `nr1-main/videos/processed` and `nr1-main/videos/temp`.
- Old files are cleaned up automatically every 30 minutes.

## 6. Logging
- Errors are logged to the console. For production, consider using a logging service or redirecting output to a file.

## 7. Testing
- Test with various YouTube URLs (public, private, age-restricted, long, short, etc.).
- Test on both desktop and mobile browsers.

## 8. Security
- Helmet and CORS are enabled by default.
- Rate limiting is enabled on all API endpoints.

## 9. Troubleshooting
- Ensure FFmpeg is installed and accessible.
- Check server logs for errors.
- Make sure the server has write permissions to the `videos/` directory.

---

For more details, see the main README.md.
