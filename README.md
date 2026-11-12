# Souq Signal Algeria

أريد بناء تطبيق ويب تفاعلي ومتجاوب مع الهواتف (Mobile-First PWA) باللغة العربية (اتجاه RTL) تحت اسم 'وين راهي؟' لمتابعة توفر السلع والأسعار في الجزائر.

المواصفات المطلوبة في التطبيق:

1. الواجهة الرئيسية: خريطة تفاعلية كاملة الشاشة باستخدام مكتبة Leaflet (OpenStreetMap) تتمركز تلقائياً على موقع المستخدم الحالي (GPS) أو الجزائر العاصمة افتراضياً.

2. شريط التصفية العلوي (Filter Bar): أزرار أفقية قابلة للتمرير تحتوي على السلع (الكل، بطاطا، زيت المائدة، حليب الأكياس، سميد، سيولة بريدية، دواء مفقود).

3. عرض البلاغات على الخريطة: جلب البيانات من جدول reports في Supabase وعرضها كدبابيس ملونة حسب عمود status:

	• أخضر لـ available (متوفر)

	• برتقالي لـ queue (طابور)

	• أحمر لـ empty (نفدت الكمية)

4. بطاقة تفاصيل البلاغ: عند الضغط على أي دبوس، تظهر بطاقة منبثقة من الأسفل تعرض: اسم السلعة (product_name)، اسم المحل (shop_name)، السعر بالدينار الجزائري (price DA)، وقت الإضافة، وزرين للتفاعل: 'موجود فعلاً 👍' (يزيد upvotes بمقدار 1 في قاعدة البيانات) و 'نفدت الكمية 👎' (يزيد downvotes بمقدار 1).

5. زر إضافة بلاغ جديد (+): زر عائم بارز في الأسفل يفتح نافذة منبثقة لإضافة بلاغ جديد إلى جدول reports في Supabase، يختار فيها المستخدم: السلعة (من جدول products)، اسم المحل أو الحي، السعر بالدينار، الحالة (متوفر / طابور / نفدت)، ويأخذ إحداثيات GPS الحالية للمستخدم تلقائياً.

6. التصميم: تصميم عصري، نظيف، ألوان مريحة (الأخضر الزمردي والأبيض)، خط عربي واضح مثل Cairo أو Tajawal.

بيانات الربط بـ Supabase:

• Supabase URL: https://supabase.co

• Supabase Anon Key: sb_publishable_e848pUcMifYtTD_R56belA_A7t0LpXO

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://souq-signal-algeria.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c6f46218-7677-498c-9223-171f80d127c5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
