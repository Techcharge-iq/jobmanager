
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  deleteJobImageFile,
  deleteJobImageAttachment,
  getJobImageSignedUrl,
  getJobImagePath,
  listJobImages,
  updateJobImageAttachment,
} from '@/data/jobImages';

interface JobImage {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  image_width: number | null;
  image_height: number | null;
  alt_text: string | null;
  created_at: string;
  uploaded_by: string;
}

export function useJobImages(jobOrderId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: images = [], isLoading, error } = useQuery({
    queryKey: ['job-images', jobOrderId],
    queryFn: async (): Promise<JobImage[]> => {
      return listJobImages(jobOrderId);
    },
    enabled: !!jobOrderId,
    staleTime: 5 * 60_000,
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      // First get the image details
      const filePath = await getJobImagePath(imageId);

      // Delete from storage
      await deleteJobImageFile(filePath);

      // Delete from database
      await deleteJobImageAttachment(imageId);

      return imageId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-images', jobOrderId] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: (error: unknown) => {
      console.error('Error deleting image:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      });
    }
  });

  const updateAltTextMutation = useMutation({
    mutationFn: async ({ imageId, altText }: { imageId: string; altText: string }) => {
      await updateJobImageAttachment(imageId, { alt_text: altText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-images', jobOrderId] });
      toast({
        title: "Success",
        description: "Image description updated",
      });
    },
    onError: (error: unknown) => {
      console.error('Error updating alt text:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update image description",
        variant: "destructive",
      });
    }
  });

  const getImageUrl = useCallback(async (filePath: string): Promise<string> => {
    return getJobImageSignedUrl(filePath);
  }, []);

  return {
    images,
    isLoading,
    error,
    deleteImage: deleteImageMutation.mutate,
    isDeletingImage: deleteImageMutation.isPending,
    updateAltText: updateAltTextMutation.mutate,
    isUpdatingAltText: updateAltTextMutation.isPending,
    getImageUrl
  };
}
