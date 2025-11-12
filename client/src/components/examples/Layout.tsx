import Layout from '../Layout';

export default function LayoutExample() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Page Content Goes Here</h1>
        <p className="text-muted-foreground">This is an example of the layout wrapper with navigation and footer.</p>
      </div>
    </Layout>
  );
}
