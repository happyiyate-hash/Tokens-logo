import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Welcome to Your DCDN Dashboard!
      </h1>
      <p className="text-lg text-gray-700 mb-4">
        This is your central hub for managing token logos and API keys for your
        Decentralized Content Delivery Network.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-blue-100 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-blue-800 mb-2">
            Upload Logos
          </h2>
          <p className="text-blue-700">
            Add new token images with their symbols and decimal values.
          </p>
          <p className="mt-3 text-sm">
            Go to <Badge variant="secondary">Upload Token</Badge>
          </p>
        </div>
        <div className="bg-green-100 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-green-800 mb-2">
            Manage Tokens
          </h2>
          <p className="text-green-700">
            View, edit, and remove existing token logos.
          </p>
          <p className="mt-3 text-sm">
            Go to <Badge variant="secondary">Tokens List</Badge>
          </p>
        </div>
        <div className="bg-purple-100 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-purple-800 mb-2">
            API Keys
          </h2>
          <p className="text-purple-700">
            Generate and manage API keys for wallet integration.
          </p>
          <p className="mt-3 text-sm">
            Go to <Badge variant="secondary">API Keys</Badge>
          </p>
        </div>
      </div>

      <div className="mt-10 p-6 bg-gray-100 rounded-lg border-l-4 border-gray-400">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">
          How it Works:
        </h3>
        <ol className="list-decimal list-inside text-gray-700 space-y-2">
          <li>
            Upload your token logos with associated symbols and decimals here.
          </li>
          <li>
            Our CDN (backend) will store these logos and make them accessible
            via unique URLs.
          </li>
          <li>Generate an API key from this dashboard.</li>
          <li>
            Integrate this API key into your crypto wallet or DApp.
          </li>
          <li>
            When your wallet needs a logo, it will make a request to your CDN
            using the API key and token symbol.
          </li>
          <li>Your CDN will return the corresponding logo image.</li>
        </ol>
      </div>
    </div>
  );
}
