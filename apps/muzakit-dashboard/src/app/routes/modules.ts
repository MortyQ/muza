import authRoutes from "@/app/routes/paths/authRoutes";
import coreRoutes from "@/app/routes/paths/coreRoutes";
import mockRoutes from "@/app/routes/paths/mockRoutes";

export default [
  ...authRoutes,
  ...coreRoutes,
  ...mockRoutes,
];
