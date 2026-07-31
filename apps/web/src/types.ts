// App-local component prop types. Everything framework-free lives in
// @frontsail/qr-core; this file holds the React-flavored leftovers.
export interface FormComponentProps<T> {
  data: T;
  onChange: (data: T) => void;
}
