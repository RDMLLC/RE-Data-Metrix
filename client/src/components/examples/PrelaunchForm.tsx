import PrelaunchForm from '../PrelaunchForm';
import { Card } from '@/components/ui/card';

export default function PrelaunchFormExample() {
  return (
    <div className="p-8 bg-background">
      <Card className="max-w-2xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-6">Get Early Access</h2>
        <PrelaunchForm source="home_prelaunch" />
      </Card>
    </div>
  );
}
