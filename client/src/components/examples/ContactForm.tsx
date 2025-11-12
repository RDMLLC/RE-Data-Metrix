import ContactForm from '../ContactForm';
import { Card } from '@/components/ui/card';

export default function ContactFormExample() {
  return (
    <div className="p-8 bg-background">
      <Card className="max-w-2xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
        <ContactForm />
      </Card>
    </div>
  );
}
