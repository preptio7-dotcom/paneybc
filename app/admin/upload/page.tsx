import { AdminHeader } from '@/components/admin-header'
import { UploadTabs } from '@/components/upload-tabs'
import { RecentUploads } from '@/components/recent-uploads'

export default function AdminUploadPage() {
  return (
    <main className="min-h-screen bg-background-light">
      <AdminHeader />

      <div className="pt-[60px] pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Page Header */}
          <div className="pt-8 mb-12">
            <h1 className="font-heading text-4xl font-bold text-text-dark mb-2">
              Upload Learning Materials
            </h1>
            <p className="text-text-light">
              Add new questions, study materials, and practice content to the platform
            </p>
          </div>

          {/* Upload Tabs */}
          <div className="mb-12">
            <UploadTabs />
          </div>

          {/* Recent Uploads */}
          <div>
            <h2 className="font-heading text-2xl font-bold text-text-dark mb-6">
              Upload History
            </h2>
            <RecentUploads />
          </div>
        </div>
      </div>
    </main>
  )
}
