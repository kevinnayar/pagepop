import { FormWrapper } from '@pagepop/components/custom/form-wrapper';
import { ForgotPasswordForm } from '@pagepop/components/custom/forms/form-forgot-password';

export default function ForgotPassword() {
  return (
    <FormWrapper
      title="Reset Password"
      subtitle="Enter your email to get a password reset link"
    >
      <ForgotPasswordForm />
    </FormWrapper>
  );
}
