let currentLnglat = null;

// 初始化定位+搜索事件绑定（修复定位失败问题）
window.onload = function() {
  // 高德定位配置：开启高精度+优化失败处理
  AMap.plugin('AMap.Geolocation', function() {
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true, // 开启高精度定位（鸿蒙浏览器会弹窗申请权限，授权后定位更准）
      timeout: 15000, // 延长超时时间，提升定位成功率
      buttonPosition: 'RB',
      showButton: false, // 隐藏地图上的定位按钮（H5页面无需显示）
      showMarker: false, // 隐藏定位标记
      showCircle: false // 隐藏定位范围圆
    });

    // 定位结果处理（增强容错+详细日志）
    geolocation.getCurrentPosition(function(status, result) {
      console.log('定位状态：', status, '结果：', result); // 便于调试
      if (status === 'complete' && result.position) {
        // 定位成功：保存经纬度+显示真实位置
        currentLnglat = [result.position.lng, result.position.lat];
        
        // 增强地址获取容错逻辑
        let address = '未知位置';
        if (result.formattedAddress) {
          address = result.formattedAddress;
        } else if (result.addressComponent) {
          // 逐级获取地址组件，确保安全拼接
          const city = result.addressComponent.city || '';
          const district = result.addressComponent.district || '';
          const street = result.addressComponent.street || '';
          const streetNumber = result.addressComponent.streetNumber || '';
          
          // 智能拼接地址，避免多余分隔符
          const addressParts = [city, district, street, streetNumber].filter(Boolean);
          if (addressParts.length > 0) {
            address = addressParts.join(' ');
          }
        } else {
          // 当没有地址信息时，使用反向地理编码获取地址
          AMap.plugin('AMap.Geocoder', function() {
            const geocoder = new AMap.Geocoder();
            geocoder.getAddress(currentLnglat, function(geoStatus, geoResult) {
              if (geoStatus === 'complete' && geoResult.regeocode) {
                const reverseAddress = geoResult.regeocode.formattedAddress;
                address = reverseAddress;
                document.getElementById('locationStatus').textContent = `当前位置：${address}`;
              }
            });
          });
        }
        
        document.getElementById('locationStatus').textContent = `当前位置：${address}`;
      } else {
        // 定位失败：强制设置北京坐标（确保搜索功能可用）
        currentLnglat = [116.39748, 39.90882]; // 北京天安门经纬度（稳定可用）
        document.getElementById('locationStatus').textContent = '定位失败，默认使用北京位置';
        
        // 增强权限检查和提示
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: 'geolocation' }).then(res => {
            console.log('位置权限状态：', res.state);
            if (res.state === 'denied') {
              alert('已拒绝位置权限，若需精准定位，请在鸿蒙浏览器设置中开启位置权限');
            } else if (res.state === 'prompt') {
              alert('请允许获取位置权限，以获得更精准的搜索结果');
            }
          }).catch(err => {
            console.error('权限查询失败：', err);
          });
        } else {
          // 兼容旧版浏览器
          alert('当前浏览器不支持位置权限查询，请手动开启位置权限');
        }
        
        // 可选：尝试使用IP定位获取粗略地址
        AMap.plugin('AMap.CitySearch', function() {
          const citySearch = new AMap.CitySearch();
          citySearch.getLocalCity(function(cityStatus, cityResult) {
            if (cityStatus === 'complete' && cityResult.city) {
              document.getElementById('locationStatus').textContent = `定位失败，默认使用${cityResult.city}位置`;
            }
          });
        });
      }
    });
  });

  // 搜索按钮+回车事件（保持不变）
  document.getElementById('searchBtn').addEventListener('click', searchNearby);
  document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') searchNearby();
  });
};

// 附近POI搜索核心逻辑（保持不变，确保定位失败时也能运行）
function searchNearby() {
  const keyword = document.getElementById('searchInput').value.trim();
  const resultList = document.getElementById('resultList');

  // 输入验证
  if (!keyword) {
    alert('请输入搜索关键词（如咖啡店、公园、鸿蒙体验店）');
    return;
  }

  // 强制兜底坐标（双重保障，避免currentLnglat为null）
  if (!currentLnglat) {
    currentLnglat = [116.39748, 39.90882];
    document.getElementById('locationStatus').textContent = '定位中，暂用北京位置搜索';
  }

  // 显示加载状态
  resultList.innerHTML = '<p class="status">正在搜索附近结果...</p>';

  // 调用高德POI搜索接口
  AMap.plugin('AMap.PlaceSearch', function() {
    const placeSearch = new AMap.PlaceSearch({
      pageSize: 10, // 每次返回10条结果
      pageIndex: 1,
      type: '', // 不限制类型，关键词模糊搜索
      city: '', // 按定位位置自动匹配城市
      radius: 3000, // 搜索半径3公里（可修改为5000=5公里）
      extensions: 'base' // 返回基础信息（名称、地址、距离）
    });

    // 执行搜索（失败时给出明确提示）
    placeSearch.searchNearBy(keyword, currentLnglat, function(status, result) {
      if (status === 'complete') {
        if (result.poiList && result.poiList.pois.length > 0) {
          // 渲染搜索结果
          resultList.innerHTML = '';
          result.poiList.pois.forEach(poi => {
            const distance = Math.round(poi.distance);
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
              <h3>${poi.name}</h3>
              <p>${poi.address || '地址未公开'}</p>
              <p class="distance">距离：${distance}米</p>
            `;
            resultList.appendChild(resultItem);
          });
        } else {
          resultList.innerHTML = '<p class="status">未找到相关结果，可尝试其他关键词</p>';
        }
      } else {
        resultList.innerHTML = '<p class="status">搜索失败，请检查网络后重试</p>';
      }
    });
  });
}
