






const Logo = "https://framerusercontent.com/images/Sy9bBN3BlxbdH9LakauKSvLuTDU.png?width=1709&height=691"
const Logowhite = "https://framerusercontent.com/images/Sy9bBN3BlxbdH9LakauKSvLuTDU.png?width=1709&height=691"


const FullLogo = () => {
  return (


    <>
      {/* Dark Logo   */}
      <img src={Logo} alt="logo" className="block dark:hidden rtl:scale-x-[-1]" width="128" />
      {/* Light Logo  */}
      <img src={Logowhite} alt="logo" className="hidden dark:block rtl:scale-x-[-1]" width="128" />
    </>
  );
};

export default FullLogo;
