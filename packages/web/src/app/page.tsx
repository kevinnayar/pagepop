import Link from 'next/link';

const StyledLink = ({ href, children }: { href: string; children: any }) => (
  <Link href={href} className="flex items-center justify-center py-12">
    {children}
  </Link>
);

export default function Home() {
  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <StyledLink href="/auth/login">Login</StyledLink>
      <StyledLink href="/auth/signup">Signup</StyledLink>
      <StyledLink href="/print">Print</StyledLink>
    </div>
  );
}
