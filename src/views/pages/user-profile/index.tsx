import { Icon } from "@iconify/react/dist/iconify.js"
import { useState, useEffect } from "react";
import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp";
import CardBox from "src/components/shared/CardBox";
import profileImg from "src/assets/images/profile/user-1.jpg"
import { Button } from "src/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import { Label } from "src/components/ui/label";
import { Input } from "src/components/ui/input";
import axiosClient from "src/lib/axios";

const UserProfile = () => {
    const [openModal, setOpenModal] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const BCrumb = [
        {
            to: "/",
            title: "Home",
        },
        {
            title: "Userprofile",
        },
    ];

    const [personal, setPersonal] = useState({
        firstName: "Loading...",
        lastName: "",
        email: "loading@example.com",
        password: "",
        roleId: 1
    });

    const [tempPersonal, setTempPersonal] = useState(personal);

    const fetchUser = async () => {
        try {
            setLoading(true);
            // Attempt to get user from token if one exists
            let activeUserId = null;
            try {
                const token = localStorage.getItem("token");
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    activeUserId = payload.id || payload.sub;
                }
            } catch (e) {}

            // Fallback: If no token or no id, just grab the first user from the database
            if (!activeUserId) {
                const res: any = await axiosClient.get("/users");
                const users = res.data?.data || res.data || [];
                if (users.length > 0) {
                    activeUserId = users[0].id;
                }
            }

            if (activeUserId) {
                setUserId(activeUserId);
                const userRes: any = await axiosClient.get(`/users/${activeUserId}`);
                const userData = userRes.data || userRes;
                if (userData) {
                    const nameParts = userData.name ? userData.name.split(" ") : ["", ""];
                    setPersonal({
                        firstName: nameParts[0] || "",
                        lastName: nameParts.slice(1).join(" ") || "",
                        email: userData.email || "",
                        password: "", // do not populate password back
                        roleId: userData.roleId || 1
                    });
                }
            }
        } catch (error) {
            console.error("Failed to load user profile", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (openModal) {
            setTempPersonal({ ...personal, password: "" }); // Clear password field on open
        }
    }, [openModal, personal]);

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const fullName = `${tempPersonal.firstName} ${tempPersonal.lastName}`.trim();
            const payload: any = {
                name: fullName,
                email: tempPersonal.email,
            };
            
            if (tempPersonal.password) {
                payload.password = tempPersonal.password;
            }

            await axiosClient.put(`/users/${userId}`, payload);
            alert("Profile updated successfully!");
            setPersonal(tempPersonal);
            setOpenModal(false);
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const socialLinks = [
        { href: "https://www.facebook.com/wrappixel", icon: "streamline-logos:facebook-logo-2-solid" },
        { href: "https://twitter.com/wrappixel", icon: "streamline-logos:x-twitter-logo-solid" },
        { href: "https://github.com/wrappixel", icon: "ion:logo-github" },
        { href: "https://dribbble.com/wrappixel", icon: "streamline-flex:dribble-logo-remix" },
    ];

    return (
        <>
            <BreadcrumbComp title="User Profile" items={BCrumb} />
            <div className="flex flex-col gap-6">
                <CardBox className="p-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl relative w-full break-words">
                        <div>
                            <img src={profileImg} alt="image" width={80} height={80} className="rounded-full" />
                        </div>
                        <div className="flex flex-wrap gap-4 justify-center sm:justify-between items-center w-full">
                            <div className="flex flex-col sm:text-left text-center gap-1.5">
                                <h5 className="card-title">{personal.firstName} {personal.lastName}</h5>
                                <div className="flex flex-wrap items-center gap-1 md:gap-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">System Admin</p>
                                    <div className="hidden h-4 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Database User #{userId}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {socialLinks.map((item, index) => (
                                    <a key={index} href={item.href} target="_blank" className="flex h-11 w-11 items-center justify-center gap-2 rounded-full shadow-md border border-ld hover:bg-gray-50 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
                                        <Icon icon={item.icon} width="20" height="20" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardBox>

                <div className="grid grid-cols-1 gap-6">
                    <CardBox className="p-6 overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h5 className="card-title">Personal Information</h5>
                            <Button onClick={() => setOpenModal(true)} color={"primary"} disabled={loading} className="flex items-center gap-1.5 rounded-md">
                                <Icon icon="ic:outline-edit" width="18" height="18" /> Edit
                            </Button>
                        </div>
                        
                        {loading ? (
                            <div className="animate-pulse flex flex-col gap-4">
                                <div className="h-4 bg-white/10 rounded w-1/4"></div>
                                <div className="h-4 bg-white/10 rounded w-1/2"></div>
                                <div className="h-4 bg-white/10 rounded w-1/3"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-7 2xl:gap-x-32 mb-6">
                                <div><p className="text-xs text-gray-500">First Name</p><p>{personal.firstName}</p></div>
                                <div><p className="text-xs text-gray-500">Last Name</p><p>{personal.lastName}</p></div>
                                <div><p className="text-xs text-gray-500">Email</p><p>{personal.email}</p></div>
                                <div><p className="text-xs text-gray-500">User ID</p><p>#{userId || "Unknown"}</p></div>
                            </div>
                        )}
                    </CardBox>
                </div>
            </div>

            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="mb-4">
                            Edit Database Profile
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    placeholder="First Name"
                                    value={tempPersonal.firstName}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, firstName: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Last Name"
                                    value={tempPersonal.lastName}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, lastName: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    placeholder="Email"
                                    value={tempPersonal.email}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, email: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2 lg:col-span-2 mt-2">
                                <Label htmlFor="password">Update Password <span className="text-gray-500 font-normal ml-2">(leave blank to keep current password)</span></Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="New Password"
                                    value={tempPersonal.password}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, password: e.target.value })}
                                />
                            </div>
                        </div>
                    
                    <DialogFooter className="flex gap-2 mt-4">
                        <Button color={"primary"} className="rounded-md" onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button color={"lighterror"} className="rounded-md bg-lighterror dark:bg-darkerror text-error hover:bg-error hover:text-white" onClick={() => setOpenModal(false)} disabled={saving}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UserProfile;
