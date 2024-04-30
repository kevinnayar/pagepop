import { FormWrapper } from '@pagepop/components/custom/form-wrapper';
import { LoginForm } from '@pagepop/components/custom/forms/form-login';

export default function Login() {
  return (
    <FormWrapper
      title="Login"
      subtitle="Enter your email to login to your account"
    >
      <LoginForm />
    </FormWrapper>
  );
}
