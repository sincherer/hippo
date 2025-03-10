import { Layout, Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';
import { FileOutlined, SettingOutlined } from '@ant-design/icons';
import hippoLogo from '../assets/hippo.webp';
import styles from './MainLayout.module.css';

const { Header, Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const navigate = useNavigate();

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src={hippoLogo} alt="Hippo" style={{ height: 40, marginRight: 8, borderRadius: 50 }} />
          <span className={styles.hippoText} style={{ fontSize: 20, fontWeight: 'bold' }}>Hippo</span>
        </div>
        <Segmented
          size="large"
          options={[
            { label: (
              <div className={styles.segmentedItem}>
                <FileOutlined />
                <span className={styles.segmentedText}>Invoices</span>
              </div>
            ), value: 'invoices' },
            { label: (
              <div className={styles.segmentedItem}>
                <SettingOutlined />
                <span className={styles.segmentedText}>Settings</span>
              </div>
            ), value: 'settings' }
          ]}
          onChange={(value) => navigate(`/${value}`)}
        />
      </Header>
      <Content className={styles.content}>
        {children}
      </Content>
    </Layout>
  );
};

export default MainLayout;