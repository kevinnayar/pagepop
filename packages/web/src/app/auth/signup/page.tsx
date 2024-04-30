import { FormWrapper } from '@pagepop/components/custom/form-wrapper';
import { SignupForm } from '@pagepop/components/custom/forms/form-signup';

export default function Signup() {
  return (
    <FormWrapper
      title="Signup"
      subtitle="Enter your information to create an account"
    >
      <SignupForm />
    </FormWrapper>
  );
}
