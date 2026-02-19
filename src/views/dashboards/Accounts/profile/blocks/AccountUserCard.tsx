import { Icon } from "@iconify/react/dist/iconify.js";

const AccountUserCard = ({ user }: any) => {
  return (
    <div
      className="p-4 rounded-3 mb-4 rounded-xl"
      style={{
        background: "#1e1e2f",
        border: "1px solid #2c2c3e",
        color: "#e4e6eb",
      }}
    >
      <div className="d-flex align-items-center gap-2 mb-4">
        <Icon icon="solar:user-bold" height={20} />
        <h5 className="m-0 fw-semibold">User Info</h5>
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
