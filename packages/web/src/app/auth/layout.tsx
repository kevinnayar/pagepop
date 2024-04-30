import { HalfImage } from '@pagepop/components/custom/half-image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      {children}
      <HalfImage src={'/milad-fakurian-VlhPZkSpwdc-unsplash-md.jpg'} />
    </div>
  );
}
