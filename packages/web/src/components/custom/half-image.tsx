import Image from 'next/image';

export const HalfImage = ({ src }: { src: string }) => (
  <div className="hidden bg-muted min-h-screen lg:block">
    <Image
      src={src}
      alt="Image"
      width="1920"
      height="1080"
      className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
    />
  </div>
);
