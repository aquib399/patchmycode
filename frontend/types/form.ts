export interface FormProps<T> {
  initialData?: T;
  onSubmit?: (data: T) => void;
  onError?: (error: any) => void;
}
