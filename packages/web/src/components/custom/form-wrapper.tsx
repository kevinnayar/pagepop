type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export const FormWrapper = ({ title, subtitle, children }: Props) => (
  <div className="flex items-center justify-center py-12">
    <div className="mx-auto grid w-[350px] gap-6">
      <div className="grid gap-2 text-center mb-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  </div>
);
