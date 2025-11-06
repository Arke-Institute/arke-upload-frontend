/**
 * CSS Styles
 */
export const styles = `
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner {
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-left-color: #3b82f6;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
    }
  </style>
`;
