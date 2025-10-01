import { CookingPot, type LucideProps } from 'lucide-react';

export const Icons = {
  Logo: (props: LucideProps) => (
    <div className="flex items-center justify-center rounded-lg bg-primary p-2">
      <CookingPot className="text-primary-foreground" {...props} />
    </div>
  ),
};
