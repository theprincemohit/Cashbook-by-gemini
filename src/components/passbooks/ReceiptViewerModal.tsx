import { Dimensions, Image, Modal, Pressable, SafeAreaView, Text, View, ActivityIndicator } from 'react-native';
import Pdf from 'react-native-pdf';

interface ReceiptViewerModalProps {
  fullReceiptUrl: string | null;
  setFullReceiptUrl: (url: string | null) => void;
  isDownloading: boolean;
  handleDownloadReceipt: (url: string) => void;
}

export function ReceiptViewerModal({
  fullReceiptUrl,
  setFullReceiptUrl,
  isDownloading,
  handleDownloadReceipt,
}: ReceiptViewerModalProps) {
  if (!fullReceiptUrl) return null;

  const urlLower = fullReceiptUrl.toLowerCase();
  const isDoc =
    urlLower.endsWith('.pdf') ||
    urlLower.endsWith('.doc') ||
    urlLower.endsWith('.docx') ||
    urlLower.includes('application/pdf');

  return (
    <Modal
      visible={!!fullReceiptUrl}
      animationType="fade"
      transparent={false}
      onRequestClose={() => setFullReceiptUrl(null)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#121214' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: '#121214',
            position: 'relative',
          }}
        >
          <Pressable
            onPress={() => setFullReceiptUrl(null)}
            style={{ position: 'absolute', left: 16, padding: 8 }}
            hitSlop={12}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '400' }}>‹</Text>
          </Pressable>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>
            Attachment Preview
          </Text>
        </View>

        {/* Main Preview Area */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
          {isDoc ? (
            <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#000000' }}>
              <Pdf
                trustAllCerts={false}
                source={{ uri: fullReceiptUrl, cache: true }}
                onLoadComplete={(numberOfPages) => {
                  console.log(`PDF loaded. Total pages: ${numberOfPages}`);
                }}
                onError={(error) => {
                  console.log('PDF Error:', error);
                }}
                style={{ flex: 1, width: Dimensions.get('window').width, height: Dimensions.get('window').height }}
              />
            </View>
          ) : (
            <Image
              source={{ uri: fullReceiptUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Bottom Dual Action Bar (Share & Download) */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#121214',
            paddingBottom: 24,
            paddingTop: 16,
            paddingHorizontal: 16,
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => handleDownloadReceipt(fullReceiptUrl)}
            disabled={isDownloading}
            style={({ pressed }) => [
              {
                flex: 1,
                flexDirection: 'row',
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 8,
                gap: 8,
              },
              pressed && { opacity: 0.8 },
              isDownloading && { opacity: 0.5 },
            ]}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>⬇️</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                  Download & Share
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
