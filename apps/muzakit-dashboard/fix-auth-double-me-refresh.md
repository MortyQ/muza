# Fix: Double auth/me + Missing Refresh on Token Deletion

> **Scope:** `src/app/routes/utils/guards.ts`
>
> **Root causes:**
> 1. `ensureAuthInitialized` викликається конкурентно — `authGuard` (global `beforeEach`) і `guestGuard` (route-level `beforeEnter` на `/auth`). Обидва бачать `isInitialized = false`, поки перший запит ще летить → два `GET /me`
> 2. Коли access token видалений але refresh token є — axios interceptor **не додає** `Authorization` header в запит на `/me`. Сервер повертає `401`. Interceptor бачить 401 без auth header → пропускає refresh (захист від infinite loop) → одразу `onTokenRefreshFailed` → logout

---

## STEP 1 — `src/app/routes/utils/guards.ts`

### 1.1 Додати singleton promise lock

Замінити функцію `ensureAuthInitialized` повністю:

```ts
// Додати імпорт вгорі файлу
import { myAxios } from "@/shared/config/axios";

// Лок — щоб concurrent виклики не запускали два /me
let _initPromise: Promise<boolean> | null = null;

async function ensureAuthInitialized(
  authStore: ReturnType<typeof useAuthStore>,
): Promise<boolean> {
  if (authStore.isInitialized) return true;

  // Якщо ініціалізація вже летить — повертаємо той самий promise
  if (_initPromise) return _initPromise;

  const accessToken = tokenManager.getAccessToken();
  const refreshToken = tokenManager.getRefreshToken();

  // Немає нічого — не автентифікований
  if (!accessToken && !refreshToken) return false;

  _initPromise = (async (): Promise<boolean> => {
    // Access token відсутній, але refresh є.
    // Axios interceptor не триггерить refresh коли немає Authorization header
    // (захист від infinite loop) — тому рефрешимо явно.
    if (!accessToken && refreshToken) {
      try {
        const { data } = await myAxios.post<{
          accessToken: string
          refreshToken: string
        }>("/auth/refresh", { refreshToken });

        tokenManager.setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      }
      catch {
        // Refresh token прострочений або невалідний
        tokenManager.clearTokens();
        return false;
      }
    }

    try {
      await authStore.initialize();
      return authStore.isInitialized;
    }
    catch {
      // НЕ чіпаємо токени тут — onTokenRefreshFailed вже обробляє logout
      // через _onAuthFailed → authStore.logout()
      return false;
    }
  })().finally(() => {
    _initPromise = null;
  });

  return _initPromise;
}
```

---

## Чому це фіксить обидві проблеми

| Проблема | До | Після |
|---|---|---|
| Double `/me` | Два concurrent виклики → два запити | `_initPromise` — обидва чекають один результат |
| No refresh | AT відсутній → no auth header → interceptor skip → logout | Явний POST `/auth/refresh` перед `/me` |
| Wrong token clear | `catch` чистив токени при будь-якій помилці | `clearTokens` тільки при невалідному refresh; `/me` помилки не чіпають токени |

---

## CONSTRAINTS

- Змінювати **тільки** `guards.ts`
- Не чіпати `axios.ts` — `onTokenRefreshFailed` → `_onAuthFailed` → `logout()` вже правильний
- Не чіпати `useAuthStore.ts`, `useUserStore.ts`, `LoginForm.vue`
- Не додавати нових залежностей

