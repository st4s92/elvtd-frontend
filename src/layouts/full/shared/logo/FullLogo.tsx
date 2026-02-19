






const Logo = "https://framerusercontent.com/images/8bHc9rwsumDBdbuV6kkZjH6bY4.png?scale-down-to=64"
const Logowhite = "https://framerusercontent.com/images/8bHc9rwsumDBdbuV6kkZjH6bY4.png?scale-down-to=64"


const FullLogo = () => {
  return (


    <>
      {/* Dark Logo   */}
      <img src={Logo} alt="logo" className="block dark:hidden rtl:scale-x-[-1]" />
      {/* Light Logo  */}
      <img src={Logowhite} alt="logo" className="hidden dark:block rtl:scale-x-[-1]" />
    </>
  );
};

export default FullLogo;
