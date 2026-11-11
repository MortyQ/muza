import { toast } from "vue-sonner";

export interface ToastPromiseOptions<T> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: Error) => string)
}

export interface UseToastReturn {
  success: (message: string, description?: string) => void
  error: (message: string, description?: string) => void
  warning: (message: string, description?: string) => void
  info: (message: string, description?: string) => void
  promise: <T>(
    promise: Promise<T>,
    options: ToastPromiseOptions<T>,
  ) => ReturnType<typeof toast.promise<T>>
  custom: (message: string, options?: Record<string, unknown>) => string | number
  dismiss: (toastId?: string | number) => void
}

/**
 * Custom toast composable with project styling
 * Uses vue-sonner under the hood
 */
export const useToast = (): UseToastReturn => {
  const success = (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    });
  };

  const error = (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 5000,
    });
  };

  const warning = (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 4000,
    });
  };

  const info = (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    });
  };

  const promise = <T>(
    promise: Promise<T>,
    options: {
      loading: string

      success: string | ((data: T) => string)

      error: string | ((error: Error) => string)
    },
  ) => {
    return toast.promise(promise, options);
  };

  const custom = (message: string, options?: Record<string, unknown>) => {
    return toast(message, options);
  };

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId);
  };

  return {
    success,
    error,
    warning,
    info,
    promise,
    custom,
    dismiss,
  };
};
