import { Icon } from "@iconify/react/dist/iconify.js";

const AccountUserCard = ({ user }: any) => {
  return (
    <div
      className="p-6 mb-4 rounded-3xl bg-[rgba(233,223,255,0.04)] backdrop-blur-md text-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg"
    >
      <div className="d-flex align-items-center gap-2 mb-4">
        <Icon icon="solar:user-bold" height={20} />
        <h5 className="m-0 fw-semibold text-white">User Info</h5>
      </div>

      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          style={{
            width: 45,
            height: 45,
            borderRadius: "50%",
            background: "#2e8bff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            color: "#fff",
          }}
        >
          {user.name?.charAt(0).toUpperCase()}
        </div>

        <div>
          <div className="fw-semibold">{user.name}</div>
          <div className="text-muted small">
            <Icon icon="solar:letter-bold" height={14} /> {user.email}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountUserCard;
