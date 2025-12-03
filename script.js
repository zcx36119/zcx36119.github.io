// 简化版附近搜索工具 - 修复地址获取问题
let currentLnglat = null;
let isLoading = false;

// 页面加载完成后执行
window.onload = function() {
  console.log('页面加载完成，开始初始化...');
  
  // 初始化定位
  initLocation();
  
  // 绑定搜索事件
  bindSearchEvents();
};

// 初始化定位功能
function initLocation() {
  const statusElement = document.getElementById('locationStatus');
  
  // 显示初始加载状态
  statusElement.textContent = '正在获取位置...';
  
  // 检查浏览器是否支持地理定位
  if (!navigator.geolocation) {
    console.error('浏览器不支持地理定位');
    statusElement.textContent = '浏览器不支持定位功能';
    // 使用默认坐标
    currentLnglat = [116.39748, 39.90882];
    return;
  }
  
  // 首先尝试浏览器原生定位
  navigator.geolocation.getCurrentPosition(
    // 定位成功回调
    function(position) {
      console.log('浏览器原生定位成功');
      const latLng = [position.coords.longitude, position.coords.latitude];
      currentLnglat = latLng;
      
      // 获取地址信息
      getAddressByLatLng(latLng);
    },
    // 定位失败回调
    function(error) {
      console.error('浏览器原生定位失败:', error.message);
      
      // 使用高德地图定位作为备选
      useAmapLocation();
    },
    // 定位选项
    {
      enableHighAccuracy: true,
      timeout: 10000, // 10秒超时
      maximumAge: 0
    }
  );
}

// 使用高德地图定位
function useAmapLocation() {
  const statusElement = document.getElementById('locationStatus');
  
  // 检查高德地图API是否加载完成
  if (typeof AMap === 'undefined') {
    console.error('高德地图API未加载');
    statusElement.textContent = '地图服务加载失败';
    // 使用默认坐标
    currentLnglat = [116.39748, 39.90882];
    statusElement.textContent = '定位失败，默认使用北京位置';
    return;
  }
  
  // 加载高德定位插件
  AMap.plugin('AMap.Geolocation', function() {
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
      showButton: false,
      showMarker: false,
      showCircle: false
    });
    
    // 执行高德定位
    geolocation.getCurrentPosition(function(status, result) {
      if (status === 'complete' && result.position) {
        console.log('高德地图定位成功');
        const latLng = [result.position.lng, result.position.lat];
        currentLnglat = latLng;
        
        // 获取地址信息
        getAddressByLatLng(latLng);
      } else {
        console.error('高德地图定位失败:', result);
        // 使用默认坐标
        currentLnglat = [116.39748, 39.90882];
        statusElement.textContent = '定位失败，默认使用北京位置';
      }
    });
  });
}

// 根据经纬度获取地址信息
function getAddressByLatLng(latLng) {
  const statusElement = document.getElementById('locationStatus');
  
  // 检查高德地图API是否加载完成
  if (typeof AMap === 'undefined') {
    console.error('高德地图API未加载');
    statusElement.textContent = `当前位置：经纬度(${latLng[0].toFixed(4)}, ${latLng[1].toFixed(4)})`;
    return;
  }
  
  // 加载高德地理编码插件
  AMap.plugin('AMap.Geocoder', function() {
    const geocoder = new AMap.Geocoder({
      radius: 1000,
      extensions: 'base'
    });
    
    // 执行反向地理编码
    geocoder.getAddress(latLng, function(status, result) {
      if (status === 'complete' && result.regeocode) {
        const address = result.regeocode.formattedAddress;
        console.log('获取地址成功:', address);
        statusElement.textContent = `当前位置：${address}`;
      } else {
        console.error('反向地理编码失败:', result);
        // 如果获取地址失败，显示经纬度
        statusElement.textContent = `当前位置：经纬度(${latLng[0].toFixed(4)}, ${latLng[1].toFixed(4)})`;
      }
    });
  });
}

// 绑定搜索事件
function bindSearchEvents() {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  
  // 搜索按钮点击事件
  searchBtn.addEventListener('click', function() {
    performSearch();
  });
  
  // 回车键搜索
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
}

// 执行搜索
function performSearch() {
  // 防止重复搜索
  if (isLoading) {
    return;
  }
  
  const searchInput = document.getElementById('searchInput');
  const keyword = searchInput.value.trim();
  const resultList = document.getElementById('resultList');
  
  // 输入验证
  if (!keyword) {
    alert('请输入搜索关键词');
    return;
  }
  
  // 检查是否有定位坐标
  if (!currentLnglat) {
    alert('正在获取位置，请稍后再试');
    return;
  }
  
  // 显示加载状态
  isLoading = true;
  resultList.innerHTML = '<p class="status">正在搜索附近结果...</p>';
  
  // 加载高德搜索插件
  AMap.plugin('AMap.PlaceSearch', function() {
    const placeSearch = new AMap.PlaceSearch({
      pageSize: 10,
      pageIndex: 1,
      radius: 3000,
      extensions: 'base'
    });
    
    // 执行附近搜索
    placeSearch.searchNearBy(keyword, currentLnglat, function(status, result) {
      // 恢复搜索状态
      isLoading = false;
      
      if (status === 'complete') {
        if (result.poiList && result.poiList.pois.length > 0) {
          // 渲染搜索结果
          renderSearchResults(result.poiList.pois);
        } else {
          resultList.innerHTML = '<p class="status">未找到相关结果</p>';
        }
      } else {
        console.error('搜索失败:', result);
        resultList.innerHTML = '<p class="status">搜索失败，请稍后重试</p>';
      }
    });
  });
}

// 渲染搜索结果
function renderSearchResults(pois) {
  const resultList = document.getElementById('resultList');
  
  // 清空现有结果
  resultList.innerHTML = '';
  
  // 遍历结果并渲染
  pois.forEach(poi => {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    // 计算距离
    const distance = Math.round(poi.distance);
    
    // 构建结果HTML
    resultItem.innerHTML = `
      <h3>${poi.name}</h3>
      <p>${poi.address || '地址未公开'}</p>
      <p class="distance">距离：${distance}米</p>
    `;
    
    // 添加到结果列表
    resultList.appendChild(resultItem);
  });
}
