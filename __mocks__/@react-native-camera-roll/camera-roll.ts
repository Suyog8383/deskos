export type PhotoIdentifier = {
  node: {
    id: string;
    image: { uri: string; filename: string | null; height: number; width: number };
    timestamp: number;
    type: string;
  };
};

export const CameraRoll = {
  getPhotos: jest.fn(async () => ({
    edges: [] as PhotoIdentifier[],
    page_info: { has_next_page: false, end_cursor: undefined as string | undefined },
  })),
};
