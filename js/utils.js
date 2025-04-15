// --- 随机整数 ---
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  // --- D100 骰子 ---
  function rollD100() {
      return getRandomInt(1, 100);
  }
  
  // --- 从数组中随机选择一个元素 ---
  function getRandomElement(arr) {
      if (!arr || arr.length === 0) {
          return null;
      }
      return arr[Math.floor(Math.random() * arr.length)];
  }
  
  // --- 延迟执行 ---
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // --- 其他可能需要的工具函数 ---
  // function shuffleArray(array) { ... }
  // function formatNumber(num) { ... }