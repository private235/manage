/**
 * auth-guard.js
 * ملف مشترك لحماية كل صفحات الأدمن
 * يتحقق من تسجيل الدخول بـ Firebase Auth + التأكد من أن المستخدم أدمن
 * الجلسة تُحفظ تلقائياً في المتصفح (localStorage)
 */

// Firebase Config
const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBpwRyAO9Hd0y06AFxQP2VJqiwucD02kHE',
    appId: '1:728424288022:web:3fc8d5379263ca3b99ca37',
    messagingSenderId: '728424288022',
    projectId: 'e-learning-3aef4',
    authDomain: 'e-learning-3aef4.firebaseapp.com',
    databaseURL: 'https://e-learning-3aef4-default-rtdb.firebaseio.com',
    storageBucket: 'e-learning-3aef4.firebasestorage.app',
    measurementId: 'G-GTTZ690T29',
};

// Initialize Firebase (مرة واحدة فقط)
if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}

// ضبط حفظ الجلسة في المتصفح (LOCAL = تبقى حتى بعد إغلاق المتصفح)
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

/**
 * دالة تتحقق من أن المستخدم مسجل دخول وأنه أدمن
 * تُستخدم في كل الصفحات ما عدا صفحة تسجيل الدخول
 * @param {Function} onAuthorized - تُنفذ إذا كان المستخدم أدمن
 * @param {string} loginPage - مسار صفحة تسجيل الدخول (افتراضي: index.html)
 */
function guardPage(onAuthorized, loginPage = 'index.html') {
    // إخفاء المحتوى حتى يتم التحقق
    document.body.style.visibility = 'hidden';

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            // مش مسجل دخول → ارجع لصفحة الدخول
            window.location.href = loginPage;
            return;
        }

        try {
            // تحقق هل هو أدمن
            const snapshot = await firebase.database().ref('admins/' + user.uid).once('value');
            if (snapshot.val() === true) {
                // أدمن ✅ → اظهر الصفحة ونفذ الكود
                document.body.style.visibility = 'visible';
                if (onAuthorized) onAuthorized(user);
            } else {
                // مش أدمن ❌ → سجل خروج وارجع
                await firebase.auth().signOut();
                window.location.href = loginPage;
            }
        } catch (error) {
            console.error('Auth guard error:', error);
            await firebase.auth().signOut();
            window.location.href = loginPage;
        }
    });
}

/**
 * دالة تسجيل الدخول بـ Email/Password + التحقق من الأدمن
 * @param {string} email
 * @param {string} password
 * @param {string} redirectPage - الصفحة بعد تسجيل الدخول بنجاح
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function adminLogin(email, password, redirectPage = 'admin.html') {
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // تحقق هل هو أدمن
        const snapshot = await firebase.database().ref('admins/' + user.uid).once('value');
        if (snapshot.val() === true) {
            // أدمن ✅
            window.location.href = redirectPage;
            return { success: true, error: null };
        } else {
            // مش أدمن ❌
            await firebase.auth().signOut();
            return { success: false, error: 'هذا الحساب ليس لديه صلاحيات مشرف.' };
        }
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'حدث خطأ في تسجيل الدخول.';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'البريد الإلكتروني غير مسجل.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'كلمة المرور غير صحيحة.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صالح.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'تم حظر الحساب مؤقتاً بسبب محاولات كثيرة. حاول لاحقاً.';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                break;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * تسجيل خروج الأدمن
 * @param {string} loginPage
 */
async function adminLogout(loginPage = 'index.html') {
    try {
        await firebase.auth().signOut();
        window.location.href = loginPage;
    } catch (error) {
        console.error('Logout error:', error);
    }
}
