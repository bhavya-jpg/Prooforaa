import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Upload, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export function BlockchainUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file || !title) {
      toast.error('Please select a file and enter a title');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('design', file);
    formData.append('title', title);

    try {
      const response = await fetch('http://localhost:5001/api/blockchain/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Save to localStorage
        const existingDesigns = JSON.parse(localStorage.getItem('blockchainDesigns') || '[]');
        existingDesigns.push({
          id: Date.now(),
          title: data.data.title,
          filename: data.data.filename,
          uploadedAt: new Date().toISOString(),
          blockchain: data.data.blockchain
        });
        localStorage.setItem('blockchainDesigns', JSON.stringify(existingDesigns));

        setResult(data.data);
        toast.success('✅ Design registered on blockchain!');
        
        // Reset form
        setFile(null);
        setTitle('');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload design');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('design', file);

    try {
      const response = await fetch('http://localhost:5001/api/blockchain/compare', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.plagiarismDetected) {
        toast.error(data.message);
      } else {
        toast.success(data.message);
      }
    } catch (error) {
      console.error('Check error:', error);
      toast.error('Failed to check design');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">🔗 Blockchain Design Registry</h1>

      {/* Upload Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload & Register Design</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Design Title</label>
            <Input
              type="text"
              placeholder="Enter design title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Select Image</label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleUpload}
              disabled={loading || !file || !title}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Uploading...' : 'Register on Blockchain'}
            </Button>

            <Button
              onClick={handleCheckPlagiarism}
              disabled={loading || !file}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Check Plagiarism
            </Button>
          </div>
        </div>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className="p-6 border-green-500 border-2">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-700">Successfully Registered!</h3>
              <p className="text-sm text-gray-600 mt-1">Your design is now protected on Aptos blockchain</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Title:</div>
              <div className="font-medium">{result.title}</div>

              <div className="text-gray-600">File:</div>
              <div className="font-medium">{result.filename}</div>

              <div className="text-gray-600">Design Hash:</div>
              <div className="font-mono text-xs break-all">{result.blockchain.designHash}</div>

              <div className="text-gray-600">Transaction:</div>
              <div className="font-mono text-xs break-all">{result.blockchain.transactionHash}</div>

              <div className="text-gray-600">Timestamp:</div>
              <div className="font-medium">
                {new Date(result.blockchain.timestamp * 1000).toLocaleString()}
              </div>
            </div>

            <a
              href={result.blockchain.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm mt-2"
            >
              View on Aptos Explorer <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </Card>
      )}

      {/* localStorage Data Display */}
      <Card className="p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">📦 Stored Designs (localStorage)</h3>
        <Button
          onClick={() => {
            const designs = localStorage.getItem('blockchainDesigns');
            console.log('Stored designs:', JSON.parse(designs || '[]'));
            alert('Check browser console (F12) to see stored data');
          }}
          variant="outline"
          size="sm"
        >
          View localStorage Data
        </Button>
        <p className="text-sm text-gray-600 mt-2">
          Open browser DevTools (F12) → Application → Local Storage → http://localhost:8081
        </p>
      </Card>
    </div>
  );
}