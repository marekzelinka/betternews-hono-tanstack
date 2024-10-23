export type SuccessResponse<Data = void> = {
  success: true;
  message: string;
} & (Data extends void ? {} : { data: Data });

export type ErrorResponse = {
  success: false;
  error: string;
  isFormError?: boolean;
};
