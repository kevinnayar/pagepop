'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@pagepop/components/ui/button';
import { Input } from '@pagepop/components/ui/input';
import {
  Form,
  FormControl,
  // FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@pagepop/components/ui/form';

const formSchema = z.object({
  email: z.string().email({
    message: 'A valid email is required.',
  }),
});

export const ForgotPasswordForm = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="me@example.com" {...field} />
                  </FormControl>
                  {/* <FormDescription>
                    This email will be used to send you a password reset link.
                  </FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="w-full">
            Get Link
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          Go back to{' '}
          <Link href="/auth/login" className="underline">
            Login
          </Link>
        </div>
      </form>
    </Form>
  );
};
