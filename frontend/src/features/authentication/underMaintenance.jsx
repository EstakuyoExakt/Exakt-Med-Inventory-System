import { useNavigate } from "react-router-dom";
import { Wrench, ArrowLeft } from "lucide-react";

function UnderMaintenance() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 items-center justify-center h-full w-full p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-200 text-center">
        {/* Icon Badge */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-200 shadow-xs">
          <Wrench className="w-7 h-7" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Page Under Maintenance
        </h1>

        {/* Message */}
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          This page is currently undergoing maintenance. Please check back soon.
        </p>

        {/* Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnderMaintenance;
