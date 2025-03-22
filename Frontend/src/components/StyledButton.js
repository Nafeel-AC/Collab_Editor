import styled from 'styled-components';

const StyledButton = ({ children, className, type = "button", ...props }) => {
  return (
    <StyledWrapper className={className}>
      <button type={type} className="shadow__btn" {...props}>
        {children}
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .shadow__btn {
    padding: 10px 20px;
    border: none;
    font-size: 17px;
    color: #fff;
    border-radius: 7px;
    letter-spacing: 4px;
    font-weight: 700;
    text-transform: uppercase;
    transition: 0.5s;
    transition-property: box-shadow;
    width: 100%;
    background: rgb(0,140,255);
    box-shadow: 0 0 15px rgb(0,140,255, 0.5);
  }

  .shadow__btn:hover {
    box-shadow: 0 0 5px rgb(0,140,255),
                0 0 20px rgb(0,140,255),
                0 0 20px rgb(0,140,255, 0.7),
                0 0 30px rgb(0,140,255, 0.4);
  }
`;

export default StyledButton;
